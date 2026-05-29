#!/usr/bin/env python3
"""
prepare_data.py
===============
Regenerates every `data/*.json` aggregate that drives the visualization, this time
from the **real** FineWeb stream (HuggingFaceFW/fineweb, sample-10BT). It produces
exactly the same filenames and schema as `generate_aggregates.py`, so the website
works identically whether you use the shipped faithful aggregates or re-derive them
from source.

This is the Milestone-1 EDA pipeline (FineWeb_EDA.ipynb) refactored into an export
step. It streams the dataset (no full download), collects a sample into a DataFrame,
derives the same columns, and writes aggregates.

Requirements
------------
    pip install datasets pandas numpy tldextract

Usage
-----
    python scripts/prepare_data.py --sample 200000

Notes
-----
* Streaming keeps memory at O(1); only the parquet row-groups we touch are fetched.
* With the real data, per-domain counts are authoritative (the generator's are
  illustrative). Everything else has the same shape.
"""

import argparse
import json
import os
from itertools import islice

import numpy as np
import pandas as pd

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

# ---- categorisation for the domain galaxy (best-effort, by keyword) --------- #
CATEGORY_RULES = [
    ("gov", ("gov", "europa.eu", "who.int", "un.org", "nasa", "noaa", "cdc", "nih")),
    ("edu", (".edu", "ac.uk", "ac.jp", "uni-", "university")),
    ("academic", ("arxiv", "nature", "springer", "sciencedirect", "researchgate",
                  "jstor", "pubmed", "plos", "ieee", "acm", "wiley", "elsevier")),
    ("news", ("news", "times", "guardian", "bbc", "cnn", "post", "reuters",
              "bloomberg", "forbes", "wsj", "spiegel", "lemonde", "aljazeera", "npr")),
    ("tech", ("github", "gitlab", "stackoverflow", "stackexchange", "techcrunch",
              "wired", "arstechnica", "verge", "microsoft", "google", "apple",
              "mozilla", "npmjs", "pypi", "kernel", "debian", "ubuntu")),
    ("commerce", ("amazon", "ebay", "etsy", "shop", "store", "walmart", "target",
                  "booking", "tripadvisor", "yelp")),
    ("social", ("reddit", "youtube", "twitter", "instagram", "pinterest", "quora",
                "facebook", "tumblr")),
    ("reference", ("wikipedia", "wiki", "britannica", "dictionary", "investopedia",
                   "imdb", "fandom", "goodreads", "webmd", "healthline", "mayoclinic")),
    ("blog", ("blog", "wordpress", "blogspot", "medium", "substack", "squarespace",
              "wix", "weebly", "livejournal", "typepad")),
]


def categorise(domain):
    d = domain.lower()
    for cat, keys in CATEGORY_RULES:
        if any(k in d for k in keys):
            return cat
    return "other"


def jround(x, n=4):
    return round(float(x), n)


def write(name, obj):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    print(f"  wrote {name:28s} ({os.path.getsize(path)/1024:.1f} KB)")


def stream_sample(sample_size):
    from datasets import load_dataset
    import tldextract

    print(f"Streaming {sample_size:,} documents from FineWeb sample-10BT ...")
    ds = load_dataset("HuggingFaceFW/fineweb", name="sample-10BT",
                      split="train", streaming=True)
    rows = list(islice(ds, sample_size))
    df = pd.DataFrame(rows)

    df["text_length"] = df["text"].str.len()
    df["word_count"] = df["text"].str.split().str.len()
    df["crawl_date"] = pd.to_datetime(df["date"], errors="coerce")
    df["crawl_year"] = df["crawl_date"].dt.year
    df["domain"] = df["url"].apply(lambda u: tldextract.extract(u).registered_domain)
    df["tld"] = df["url"].apply(lambda u: tldextract.extract(u).suffix.split(".")[-1])
    df["chars_per_token"] = df["text_length"] / df["token_count"].clip(lower=1)
    return df


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sample", type=int, default=200_000)
    args = ap.parse_args()

    df = stream_sample(args.sample)
    tok = df["token_count"].to_numpy()
    lang = df["language_score"].to_numpy()
    cpt = df["chars_per_token"].to_numpy()
    N = len(df)
    print(f"Collected {N:,} docs. Computing aggregates ...")

    # ---- summary ------------------------------------------------------------ #
    write("summary.json", {
        "sample_docs": N,
        "total_tokens": int(tok.sum()),
        "mean_tokens": jround(tok.mean(), 1),
        "median_tokens": int(np.median(tok)),
        "n_dumps": int(df["dump"].nunique()),
        "n_unique_domains": int(df["domain"].nunique()),
        "year_min": int(df["crawl_year"].min()),
        "year_max": int(df["crawl_year"].max()),
        "median_lang_score": jround(np.median(lang), 4),
        "frac_lang_ge_095": jround((lang >= 0.95).mean(), 4),
        "median_chars_per_token": jround(np.median(cpt), 2),
        "dataset": "HuggingFaceFW/fineweb · sample-10BT",
        "full_dataset_tokens": "15T (full FineWeb) · 10B (this subset)",
    })

    # ---- funnel (static, from the paper) ------------------------------------ #
    write("funnel.json", {
        "unit": "trillion tokens",
        "stages": [
            {"name": "Raw Common Crawl", "short": "96 WARC snapshots, all languages, raw HTML",
             "tokens": 100.0, "note": "The starting point: ~15 years of web crawls."},
            {"name": "Text extraction", "short": "trafilatura pulls main text from HTML",
             "tokens": 55.0, "note": "Boilerplate, nav bars and markup are stripped."},
            {"name": "Base filtering", "short": "URL block-list + fastText English + MassiveText quality",
             "tokens": 36.0, "note": "Non-English and obvious junk removed (score < 0.65 dropped)."},
            {"name": "MinHash dedup", "short": "per-snapshot fuzzy de-duplication",
             "tokens": 20.0, "note": "Near-duplicate pages collapsed - the single biggest cut."},
            {"name": "C4 filters", "short": "C4-style rules (e.g. terminal-punctuation)",
             "tokens": 18.5, "note": "Lines without sentence structure are dropped."},
            {"name": "Custom heuristics", "short": "FineWeb's own line/repetition filters",
             "tokens": 15.0, "note": "List-spam and repetitive boilerplate removed."},
            {"name": "FineWeb", "short": "15T high-quality English tokens",
             "tokens": 15.0, "note": "The finished dataset that trains modern LLMs."},
        ],
    })

    # ---- token histogram ---------------------------------------------------- #
    lin_max = 3000
    lin_edges = np.linspace(0, lin_max, 61)
    lin_counts, _ = np.histogram(tok, bins=lin_edges)  # overflow truncated, not clipped
    log_edges = np.logspace(0, np.log10(tok.max()), 61)
    log_counts, _ = np.histogram(tok, bins=log_edges)
    write("token_hist.json", {
        "median": int(np.median(tok)), "mean": jround(tok.mean(), 1),
        "linear": {"edges": [jround(e, 1) for e in lin_edges],
                   "counts": [int(c) for c in lin_counts], "clipped_at": lin_max},
        "log": {"edges": [jround(e, 2) for e in log_edges],
                "counts": [int(c) for c in log_counts]},
    })

    # ---- language histogram ------------------------------------------------- #
    le = np.linspace(0.65, 1.0, 71)
    lc, _ = np.histogram(np.clip(lang, 0.65, 1.0), bins=le)
    write("lang_hist.json", {
        "threshold": 0.65, "edges": [jround(e, 4) for e in le],
        "counts": [int(c) for c in lc],
        "frac_ge": {t: jround((lang >= t).mean(), 4) for t in (0.90, 0.95, 0.99)},
    })

    # ---- yearly ------------------------------------------------------------- #
    yearly = []
    g = df.dropna(subset=["crawl_year"])
    for y, sub in g.groupby(g["crawl_year"].astype(int)):
        yearly.append({"year": int(y), "docs": int(len(sub)),
                       "tokens": int(sub["token_count"].sum()),
                       "mean_lang": jround(sub["language_score"].mean(), 4),
                       "median_tokens": int(sub["token_count"].median())})
    write("yearly.json", sorted(yearly, key=lambda d: d["year"]))

    # ---- per-dump ----------------------------------------------------------- #
    dumps = []
    for dn, sub in df.groupby("dump"):
        yr = int(str(dn).split("-")[2]) if "MAIN" in str(dn) else 0
        dumps.append({"dump": str(dn), "year": yr, "docs": int(len(sub)),
                      "tokens": int(sub["token_count"].sum()),
                      "mean_tokens": jround(sub["token_count"].mean(), 1),
                      "median_tokens": int(sub["token_count"].median()),
                      "mean_lang": jround(sub["language_score"].mean(), 4)})
    write("dumps.json", sorted(dumps, key=lambda d: d["dump"]))

    # ---- domains ------------------------------------------------------------ #
    dc = df.groupby("domain")
    counts = dc.size().sort_values(ascending=False)
    tokens_by_domain = dc["token_count"].sum()
    top = counts.head(len(_curated_names())).index
    domains = []
    for name in top:
        sub = df[df["domain"] == name]
        domains.append({"domain": str(name), "category": categorise(str(name)),
                        "tld": str(sub["tld"].mode().iat[0]) if len(sub) else "",
                        "docs": int(len(sub)), "tokens": int(sub["token_count"].sum()),
                        "median_tokens": int(sub["token_count"].median()),
                        "median_lang": jround(sub["language_score"].median(), 4)})
    write("domains.json", {"top": domains, "n_unique": int(df["domain"].nunique())})

    # ---- Lorenz + Gini ------------------------------------------------------ #
    asc = np.sort(counts.to_numpy())
    cum = np.cumsum(asc) / asc.sum()
    nD = len(asc)
    xfull = np.arange(1, nD + 1) / nD
    gini = float(1 - 2 * np.trapz(cum, xfull))
    idx = np.unique(np.linspace(0, nD - 1, 250).astype(int))
    write("lorenz.json", {"gini": jround(gini, 4), "n_domains": nD,
                          "points": [{"x": jround(xfull[i], 5), "y": jround(cum[i], 5)} for i in idx]})

    # ---- cumulative token coverage ------------------------------------------ #
    tok_desc = np.sort(tokens_by_domain.to_numpy())[::-1]
    cumtok = np.cumsum(tok_desc) / tok_desc.sum()
    nT = len(cumtok)
    markers = {f"{t:.2f}": int(np.searchsorted(cumtok, t) + 1) for t in (0.25, 0.50, 0.75, 0.90)}
    ridx = np.unique(np.logspace(0, np.log10(nT), 220).astype(int)) - 1
    ridx = ridx[(ridx >= 0) & (ridx < nT)]
    write("cumulative_tokens.json", {"n_domains": nT, "markers": markers,
                                     "points": [{"rank": int(r + 1), "frac": jround(cumtok[r], 5)} for r in ridx]})

    # ---- TLD ---------------------------------------------------------------- #
    tldc = df["tld"].value_counts().head(15)
    write("tld.json", [{"tld": str(k), "docs": int(v), "share": jround(v / N, 4)}
                       for k, v in tldc.items()])

    # ---- quality heatmap ---------------------------------------------------- #
    lang_bins = [0.65, 0.75, 0.85, 0.90, 0.95, 0.98, 1.0]
    tok_bins = [0, 50, 100, 200, 500, 1000, 2000, 5000]
    li = np.digitize(lang, lang_bins, right=True).clip(1, len(lang_bins) - 1) - 1
    ti = np.digitize(np.clip(tok, 0, 5000), tok_bins, right=True).clip(1, len(tok_bins) - 1) - 1
    grid = np.zeros((len(lang_bins) - 1, len(tok_bins) - 1), dtype=int)
    for a, b in zip(li, ti):
        grid[a, b] += 1
    write("quality_heatmap.json", {
        "lang_bins": lang_bins, "tok_bins": tok_bins,
        "lang_labels": [f"{lang_bins[i]:.2f}-{lang_bins[i+1]:.2f}" for i in range(len(lang_bins) - 1)],
        "tok_labels": [f"{tok_bins[i]}-{tok_bins[i+1]}" for i in range(len(tok_bins) - 1)],
        "grid": grid.tolist()})

    # ---- chars per token ---------------------------------------------------- #
    ce = np.linspace(2.5, 10, 76)
    cc, _ = np.histogram(np.clip(cpt, 2.5, 10), bins=ce)
    write("chars_per_token.json", {"median": jround(np.median(cpt), 2),
                                   "edges": [jround(e, 3) for e in ce],
                                   "counts": [int(c) for c in cc]})

    write("meta.json", {"generator": "scripts/prepare_data.py (live FineWeb stream)",
                        "sample_docs": N, "source_dataset":
                        "https://huggingface.co/datasets/HuggingFaceFW/fineweb",
                        "paper": "Penedo et al., 'The FineWeb Datasets', NeurIPS 2024"})
    print(f"\nDone. Gini={gini:.3f} | unique domains={df['domain'].nunique():,}")


def _curated_names():
    # only used to size the number of "top" domains exported (match generator: 130)
    return list(range(130))


if __name__ == "__main__":
    main()
