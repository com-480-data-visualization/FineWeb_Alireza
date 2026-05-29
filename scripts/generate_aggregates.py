#!/usr/bin/env python3
"""
generate_aggregates.py
======================
Produces the pre-computed JSON aggregates that drive the "Decanting the Web"
interactive visualization (Milestone 3).

WHY THIS EXISTS
---------------
The visualization is fed by *aggregated statistics*, not raw text. Streaming the
real FineWeb `sample-10BT` subset (10B tokens) takes several minutes and a working
`datasets` install + network. To keep the repository self-contained and the site
runnable instantly (and offline-friendly for development), this script simulates a
200,000-document sample whose distributions are faithful to the findings reported in
the Milestone-1 EDA notebook (`FineWeb_EDA.ipynb`), then computes exactly the same
aggregations the notebook computes and writes them to `data/*.json`.

To regenerate the aggregates from the **real** FineWeb stream instead, run
`scripts/prepare_data.py` (same output schema, same filenames).

What is faithful vs. illustrative
----------------------------------
* Faithful (shape matches the real EDA): token-count log-normal skew, language-score
  concentration near 1.0 with a 0.65 floor, ~96 Common-Crawl dumps spanning 2013-2024
  with recent years dominating, power-law domain concentration (moderate Gini), the
  curation funnel token counts (from Penedo et al., NeurIPS 2024), TLD mix, the
  quality landscape, and chars-per-token centered ~4-5.
* Illustrative: the *specific* per-domain document counts attached to named domains.
  The named domains are real, frequently-crawled sites; their exact counts here are
  representative of the long-tail shape, not authoritative per-site measurements.
  `prepare_data.py` produces the authoritative per-domain numbers.

Usage:  python scripts/generate_aggregates.py
Output: data/*.json
"""

import json
import os
import numpy as np

SEED = 480  # COM-480 :)
N_DOCS = 200_000
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

rng = np.random.default_rng(SEED)


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #
def jround(x, n=4):
    """JSON-safe rounding for python/numpy scalars."""
    return round(float(x), n)


def write(name, obj):
    path = os.path.join(OUT_DIR, name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    print(f"  wrote {name:28s} ({os.path.getsize(path)/1024:.1f} KB)")


# --------------------------------------------------------------------------- #
#  1 · Build the synthetic-but-faithful per-document sample
# --------------------------------------------------------------------------- #
def build_sample():
    n = N_DOCS

    # -- token_count: right-skewed log-normal (median ~ 340, long tail) --------
    token_count = rng.lognormal(mean=np.log(340), sigma=1.0, size=n)
    token_count = np.clip(np.round(token_count), 1, 60_000).astype(int)

    # -- language_score: concentrated near 1.0, hard floor at 0.65 ------------
    language_score = np.clip(1.0 - rng.exponential(0.02, size=n), 0.65, 1.0)

    # -- chars per token ~ Normal(4.5, 0.8); derive text length / word count --
    cpt = np.clip(rng.normal(4.5, 0.8, size=n), 2.5, 12.0)
    text_length = np.round(token_count * cpt).astype(int)
    word_count = np.round(token_count * 0.78).astype(int)

    # -- Common-Crawl dumps: 96 snapshots 2013-2024, recent years dominate ----
    dumps_per_year = {
        2013: 2, 2014: 5, 2015: 6, 2016: 7, 2017: 8, 2018: 8,
        2019: 8, 2020: 9, 2021: 9, 2022: 10, 2023: 11, 2024: 13,
    }
    dump_names, dump_years = [], []
    for year, k in dumps_per_year.items():
        weeks = np.linspace(5, 51, k).round().astype(int)
        for w in weeks:
            dump_names.append(f"CC-MAIN-{year}-{w:02d}")
            dump_years.append(year)
    dump_names = np.array(dump_names)
    dump_years = np.array(dump_years)
    assert len(dump_names) == 96, len(dump_names)

    # weight each dump: grows with recency (web grew; more snapshots kept)
    yr_norm = (dump_years - 2012).astype(float)
    dump_weight = (yr_norm ** 1.6) * rng.uniform(0.7, 1.3, size=len(dump_names))
    dump_weight /= dump_weight.sum()
    doc_dump_idx = rng.choice(len(dump_names), size=n, p=dump_weight)
    doc_dump = dump_names[doc_dump_idx]
    doc_year = dump_years[doc_dump_idx]

    # -- domains: power-law concentration (moderate Gini, long tail) ----------
    n_domains = 160_000
    s = 0.82
    ranks = np.arange(1, n_domains + 1)
    dprob = 1.0 / np.power(ranks, s)
    dprob /= dprob.sum()
    doc_domain_rank = rng.choice(n_domains, size=n, p=dprob)  # 0-indexed rank

    return dict(
        token_count=token_count,
        language_score=language_score,
        chars_per_token=cpt,
        text_length=text_length,
        word_count=word_count,
        dump=doc_dump,
        year=doc_year,
        dump_names=dump_names,
        dump_years=dump_years,
        domain_rank=doc_domain_rank,
        n_domains=n_domains,
    )


# --------------------------------------------------------------------------- #
#  2 · Curated realistic domain names for the top of the long tail
# --------------------------------------------------------------------------- #
#  Real, frequently-crawled web domains. Counts are assigned by power-law rank
#  (illustrative of shape, not authoritative). category drives colour in the viz.
CURATED_DOMAINS = [
    ("en.wikipedia.org", "reference"), ("wordpress.com", "blog"),
    ("blogspot.com", "blog"), ("nytimes.com", "news"), ("theguardian.com", "news"),
    ("github.com", "tech"), ("medium.com", "blog"), ("forbes.com", "news"),
    ("youtube.com", "social"), ("amazon.com", "commerce"), ("bbc.co.uk", "news"),
    ("reddit.com", "social"), ("stackoverflow.com", "tech"), ("tumblr.com", "blog"),
    ("imdb.com", "reference"), ("washingtonpost.com", "news"), ("cnn.com", "news"),
    ("nih.gov", "gov"), ("europa.eu", "gov"), ("apple.com", "tech"),
    ("etsy.com", "commerce"), ("ebay.com", "commerce"), ("quora.com", "social"),
    ("instagram.com", "social"), ("pinterest.com", "social"), ("wikihow.com", "reference"),
    ("nature.com", "academic"), ("sciencedirect.com", "academic"), ("springer.com", "academic"),
    ("researchgate.net", "academic"), ("harvard.edu", "edu"), ("mit.edu", "edu"),
    ("stanford.edu", "edu"), ("ox.ac.uk", "edu"), ("gov.uk", "gov"),
    ("who.int", "gov"), ("un.org", "gov"), ("reuters.com", "news"),
    ("bloomberg.com", "news"), ("businessinsider.com", "news"), ("wsj.com", "news"),
    ("huffpost.com", "news"), ("buzzfeed.com", "news"), ("vice.com", "news"),
    ("techcrunch.com", "tech"), ("wired.com", "tech"), ("arstechnica.com", "tech"),
    ("theverge.com", "tech"), ("gizmodo.com", "tech"), ("engadget.com", "tech"),
    ("fandom.com", "reference"), ("goodreads.com", "reference"), ("yelp.com", "commerce"),
    ("tripadvisor.com", "commerce"), ("booking.com", "commerce"), ("walmart.com", "commerce"),
    ("target.com", "commerce"), ("shopify.com", "commerce"), ("squarespace.com", "blog"),
    ("weebly.com", "blog"), ("wix.com", "blog"), ("livejournal.com", "blog"),
    ("typepad.com", "blog"), ("substack.com", "blog"), ("dev.to", "tech"),
    ("gitlab.com", "tech"), ("bitbucket.org", "tech"), ("sourceforge.net", "tech"),
    ("npmjs.com", "tech"), ("pypi.org", "tech"), ("readthedocs.io", "tech"),
    ("arxiv.org", "academic"), ("jstor.org", "academic"), ("pubmed.ncbi.nlm.nih.gov", "academic"),
    ("plos.org", "academic"), ("ieee.org", "academic"), ("acm.org", "academic"),
    ("dailymail.co.uk", "news"), ("telegraph.co.uk", "news"), ("independent.co.uk", "news"),
    ("lemonde.fr", "news"), ("spiegel.de", "news"), ("zeit.de", "news"),
    ("elpais.com", "news"), ("corriere.it", "news"), ("nrc.nl", "news"),
    ("aljazeera.com", "news"), ("npr.org", "news"), ("pbs.org", "news"),
    ("c-span.org", "gov"), ("loc.gov", "gov"), ("nasa.gov", "gov"),
    ("noaa.gov", "gov"), ("cdc.gov", "gov"), ("irs.gov", "gov"),
    ("usda.gov", "gov"), ("data.gov", "gov"), ("census.gov", "gov"),
    ("ietf.org", "tech"), ("w3.org", "tech"), ("mozilla.org", "tech"),
    ("kernel.org", "tech"), ("debian.org", "tech"), ("ubuntu.com", "tech"),
    ("redhat.com", "tech"), ("microsoft.com", "tech"), ("google.com", "tech"),
    ("adobe.com", "tech"), ("oracle.com", "tech"), ("ibm.com", "tech"),
    ("cnet.com", "tech"), ("zdnet.com", "tech"), ("makeuseof.com", "tech"),
    ("howstuffworks.com", "reference"), ("britannica.com", "reference"),
    ("dictionary.com", "reference"), ("merriam-webster.com", "reference"),
    ("investopedia.com", "reference"), ("healthline.com", "reference"),
    ("webmd.com", "reference"), ("mayoclinic.org", "reference"),
    ("psychologytoday.com", "reference"), ("allrecipes.com", "blog"),
    ("food.com", "blog"), ("epicurious.com", "blog"), ("bbcgoodfood.com", "blog"),
]

TLD_TAIL_DIST = {  # for the (un-named) long tail
    "com": 0.50, "org": 0.11, "net": 0.07, "uk": 0.045, "de": 0.040,
    "ru": 0.030, "edu": 0.028, "gov": 0.022, "fr": 0.020, "info": 0.018,
    "ca": 0.016, "au": 0.015, "nl": 0.013, "it": 0.012, "es": 0.011,
    "jp": 0.010, "io": 0.009, "co": 0.009, "us": 0.008, "se": 0.007,
}


def tld_of(domain):
    # registered-domain suffix (handles co.uk / ac.uk / ncbi.nlm.nih.gov etc.)
    parts = domain.split(".")
    two = ".".join(parts[-2:])
    if two in ("co.uk", "ac.uk", "org.uk", "gov.uk"):
        return two.split(".")[-1] if two != "co.uk" else "uk"
    return parts[-1]


# --------------------------------------------------------------------------- #
#  3 · Aggregations -> JSON
# --------------------------------------------------------------------------- #
def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Generating faithful aggregates (seed={SEED}, N={N_DOCS:,})...")
    S = build_sample()
    tok = S["token_count"]
    lang = S["language_score"]
    cpt = S["chars_per_token"]
    year = S["year"]
    dump = S["dump"]
    drank = S["domain_rank"]

    # ---- per-domain counts -------------------------------------------------- #
    uniq, counts = np.unique(drank, return_counts=True)          # rank -> docs
    order = np.argsort(-counts)                                  # by docs desc
    uniq, counts = uniq[order], counts[order]
    # tokens & language per domain (only need for top domains)
    tokens_by_rank = np.zeros(S["n_domains"], dtype=np.int64)
    np.add.at(tokens_by_rank, drank, tok)

    # ---- summary ------------------------------------------------------------ #
    total_tokens = int(tok.sum())
    n_unique_domains = int(len(uniq))
    summary = {
        "sample_docs": N_DOCS,
        "total_tokens": total_tokens,
        "mean_tokens": jround(tok.mean(), 1),
        "median_tokens": int(np.median(tok)),
        "n_dumps": int(len(S["dump_names"])),
        "n_unique_domains": n_unique_domains,
        "year_min": int(year.min()),
        "year_max": int(year.max()),
        "median_lang_score": jround(np.median(lang), 4),
        "frac_lang_ge_095": jround((lang >= 0.95).mean(), 4),
        "median_chars_per_token": jround(np.median(cpt), 2),
        # real, dataset-level facts (FineWeb paper / card)
        "dataset": "HuggingFaceFW/fineweb · sample-10BT",
        "full_dataset_tokens": "15T (full FineWeb) · 10B (this subset)",
    }
    write("summary.json", summary)

    # ---- curation funnel (Penedo et al., NeurIPS 2024) ---------------------- #
    funnel = {
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
    }
    write("funnel.json", funnel)

    # ---- token-count histogram (linear + log) ------------------------------- #
    lin_max = 3000
    lin_edges = np.linspace(0, lin_max, 61)
    # NB: do NOT clip — np.histogram ignores values above the top edge, so the long
    # tail is simply truncated from the linear view (no false spike at the last bin).
    lin_counts, _ = np.histogram(tok, bins=lin_edges)
    log_edges = np.logspace(0, np.log10(tok.max()), 61)
    log_counts, _ = np.histogram(tok, bins=log_edges)
    token_hist = {
        "median": int(np.median(tok)),
        "mean": jround(tok.mean(), 1),
        "linear": {"edges": [jround(e, 1) for e in lin_edges],
                   "counts": [int(c) for c in lin_counts],
                   "clipped_at": lin_max},
        "log": {"edges": [jround(e, 2) for e in log_edges],
                "counts": [int(c) for c in log_counts]},
    }
    write("token_hist.json", token_hist)

    # ---- language-score histogram ------------------------------------------ #
    le = np.linspace(0.65, 1.0, 71)
    lc, _ = np.histogram(lang, bins=le)
    lang_hist = {
        "threshold": 0.65,
        "edges": [jround(e, 4) for e in le],
        "counts": [int(c) for c in lc],
        "frac_ge": {t: jround((lang >= t).mean(), 4) for t in (0.90, 0.95, 0.99)},
    }
    write("lang_hist.json", lang_hist)

    # ---- yearly trends ------------------------------------------------------ #
    yearly = []
    for y in sorted(set(year.tolist())):
        m = year == y
        yearly.append({
            "year": int(y),
            "docs": int(m.sum()),
            "tokens": int(tok[m].sum()),
            "mean_lang": jround(lang[m].mean(), 4),
            "median_tokens": int(np.median(tok[m])),
        })
    write("yearly.json", yearly)

    # ---- per-dump ----------------------------------------------------------- #
    name_to_year = dict(zip(S["dump_names"], S["dump_years"]))
    dumps = []
    for dn in S["dump_names"]:
        m = dump == dn
        c = int(m.sum())
        dumps.append({
            "dump": dn,
            "year": int(name_to_year[dn]),
            "docs": c,
            "tokens": int(tok[m].sum()) if c else 0,
            "mean_tokens": jround(tok[m].mean(), 1) if c else 0,
            "median_tokens": int(np.median(tok[m])) if c else 0,
            "mean_lang": jround(lang[m].mean(), 4) if c else 0,
        })
    write("dumps.json", dumps)

    # ---- top domains (named) for the galaxy --------------------------------- #
    rng2 = np.random.default_rng(SEED + 1)
    n_named = len(CURATED_DOMAINS)
    domains = []
    for i in range(min(n_named, len(uniq))):
        rank = int(uniq[i])
        name, cat = CURATED_DOMAINS[i]
        docs = int(counts[i])
        domains.append({
            "domain": name,
            "category": cat,
            "tld": tld_of(name),
            "docs": docs,
            "tokens": int(tokens_by_rank[rank]),
            "median_tokens": int(max(50, rng2.lognormal(np.log(340), 0.5))),
            "median_lang": jround(min(1.0, 0.96 + rng2.normal(0, 0.02)), 4),
        })
    write("domains.json", {"top": domains, "n_unique": n_unique_domains})

    # ---- Lorenz curve + Gini (full domain distribution) --------------------- #
    asc = np.sort(counts)                      # ascending doc counts per domain
    cum = np.cumsum(asc) / asc.sum()
    nD = len(asc)
    xfull = np.arange(1, nD + 1) / nD
    gini = float(1 - 2 * np.trapz(cum, xfull))
    # downsample to ~250 points for the web
    idx = np.unique(np.linspace(0, nD - 1, 250).astype(int))
    lorenz = {
        "gini": jround(gini, 4),
        "points": [{"x": jround(xfull[i], 5), "y": jround(cum[i], 5)} for i in idx],
        "n_domains": nD,
    }
    write("lorenz.json", lorenz)

    # ---- cumulative token coverage by domain rank --------------------------- #
    tok_desc = np.sort(tokens_by_rank[tokens_by_rank > 0])[::-1]
    cumtok = np.cumsum(tok_desc) / tok_desc.sum()
    nT = len(cumtok)
    markers = {}
    for target in (0.25, 0.50, 0.75, 0.90):
        markers[f"{target:.2f}"] = int(np.searchsorted(cumtok, target) + 1)
    # log-spaced sample of ranks
    ridx = np.unique(np.logspace(0, np.log10(nT), 220).astype(int)) - 1
    ridx = ridx[(ridx >= 0) & (ridx < nT)]
    cumulative = {
        "points": [{"rank": int(r + 1), "frac": jround(cumtok[r], 5)} for r in ridx],
        "markers": markers,
        "n_domains": nT,
    }
    write("cumulative_tokens.json", cumulative)

    # ---- TLD breakdown ------------------------------------------------------ #
    # named-domain TLDs (exact) + modelled tail
    tld_counts = {}
    for d in domains:
        tld_counts[d["tld"]] = tld_counts.get(d["tld"], 0) + d["docs"]
    named_docs = sum(d["docs"] for d in domains)
    tail_docs = N_DOCS - named_docs
    tail_keys = list(TLD_TAIL_DIST.keys())
    tail_probs = np.array(list(TLD_TAIL_DIST.values()))
    tail_probs = tail_probs / tail_probs.sum()
    tail_assign = rng2.multinomial(tail_docs, tail_probs)
    for k, c in zip(tail_keys, tail_assign):
        tld_counts[k] = tld_counts.get(k, 0) + int(c)
    tld_sorted = sorted(tld_counts.items(), key=lambda kv: -kv[1])[:15]
    tld = [{"tld": k, "docs": int(v), "share": jround(v / N_DOCS, 4)} for k, v in tld_sorted]
    write("tld.json", tld)

    # ---- quality landscape: language-score x token-count -------------------- #
    lang_bins = [0.65, 0.75, 0.85, 0.90, 0.95, 0.98, 1.0]
    tok_bins = [0, 50, 100, 200, 500, 1000, 2000, 5000]
    li = np.digitize(lang, lang_bins, right=True).clip(1, len(lang_bins) - 1) - 1
    ti = np.digitize(np.clip(tok, 0, 5000), tok_bins, right=True).clip(1, len(tok_bins) - 1) - 1
    grid = np.zeros((len(lang_bins) - 1, len(tok_bins) - 1), dtype=int)
    for a, b in zip(li, ti):
        grid[a, b] += 1
    quality = {
        "lang_bins": lang_bins,
        "tok_bins": tok_bins,
        "lang_labels": [f"{lang_bins[i]:.2f}-{lang_bins[i+1]:.2f}" for i in range(len(lang_bins) - 1)],
        "tok_labels": [f"{tok_bins[i]}-{tok_bins[i+1]}" for i in range(len(tok_bins) - 1)],
        "grid": grid.tolist(),
    }
    write("quality_heatmap.json", quality)

    # ---- chars-per-token histogram ------------------------------------------ #
    ce = np.linspace(2.5, 10, 76)
    cc, _ = np.histogram(np.clip(cpt, 2.5, 10), bins=ce)
    write("chars_per_token.json", {
        "median": jround(np.median(cpt), 2),
        "edges": [jround(e, 3) for e in ce],
        "counts": [int(c) for c in cc],
    })

    # ---- provenance --------------------------------------------------------- #
    write("meta.json", {
        "generator": "scripts/generate_aggregates.py",
        "seed": SEED,
        "sample_docs": N_DOCS,
        "faithful_to": "FineWeb_EDA.ipynb (Milestone 1)",
        "note": ("Aggregates are computed from a simulated sample whose distributions "
                 "match the Milestone-1 EDA. Per-domain counts are illustrative of the "
                 "long-tail shape. Run scripts/prepare_data.py to regenerate from the "
                 "live FineWeb stream (identical schema)."),
        "source_dataset": "https://huggingface.co/datasets/HuggingFaceFW/fineweb",
        "paper": "Penedo et al., 'The FineWeb Datasets', NeurIPS 2024",
    })

    print(f"\nDone. Gini={gini:.3f} | unique domains={n_unique_domains:,} | "
          f"median tokens={int(np.median(tok))} | P(lang>=0.95)={(lang>=0.95).mean():.1%}")
    # diagnostics: document coverage of the head (should be a long tail)
    csum = np.cumsum(counts) / counts.sum()
    for k in (1, 30, 100, 1000):
        if k <= len(csum):
            print(f"  top {k:>4} domains cover {csum[k-1]:6.2%} of documents")
    print(f"Coverage markers (domains for X% of tokens): {markers}")


if __name__ == "__main__":
    main()
