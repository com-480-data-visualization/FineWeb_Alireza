# 🎥 Screencast: "Decanting the Web"

**▶ Watch the 2-minute video:**
https://drive.google.com/file/d/1bBN4NYmE1X15sft0V5nxJhfG020pXn0W/view?usp=sharing

A two-minute narrated walkthrough of the interactive visualization for a general,
ML-curious audience. It follows the data story end to end: the curation funnel, document
length, the domain galaxy, domain concentration, and the quality landscape, with the
interactions demonstrated live. The beat sheet below documents the structure of the video.

---

## Beat sheet (structure of the video)

| Time | On screen | Narration |
|------|-----------|-----------|
| **0:00-0:10** | Hero section. The title animation settles. | "Every AI model is what it eats. Before it can write, it has to read, and most of what it reads comes from one dataset: **FineWeb**. This is the story of how the open web becomes AI training data." |
| **0:10-0:22** | Click **"Follow the journey"**; brief pause on the intro stats strip. | "We streamed two hundred thousand documents from FineWeb and measured them. Ninety-six snapshots of the web, seventy-thousand domains, twelve years. Here's what we found." |
| **0:22-0:42** | **Funnel**, revealed one stage at a time. Hover the **MinHash dedup** stage to pop the tooltip. | "It starts with the entire web: about a hundred trillion tokens of raw noise. Watch it get filtered: extract the text, keep only good English, and the biggest cut of all, remove the duplicates. What survives? Just fifteen trillion tokens. **Eighty-five percent is discarded.**" |
| **0:42-0:56** | **Document length.** Land on the linear view, then click **"Log scale"**. | "How long is a typical web page? Tiny, about three hundred tokens. But flip to a log scale and the shape snaps into a clean bell. The web's documents are log-normal, with a few giant outliers carrying huge amounts of text." |
| **0:56-1:08** | **Domain galaxy.** Let the bubbles settle; click a category swatch; search a domain (e.g. "wikipedia"). | "Where does all this text come from? Each bubble is a domain: news, wikis, blogs, code. You can filter by type, or search for any site, and there's Wikipedia, one of the giants." |
| **1:08-1:24** | **Concentration.** Show the Lorenz curve and Gini, then click **"Token coverage."** | "But the web is not evenly distributed. A handful of domains dominate, with a Gini of nearly point six. Just **three hundred domains** supply a quarter of *all* the text a model reads." |
| **1:24-1:38** | **Quality landscape.** Scroll so the dominant cell highlights. | "Cross length with language confidence and the whole dataset collapses into one bright region: confident English of medium length. That is the heart of what the model learns from." |
| **1:38-1:52** | Scroll to the **takeaways** cards; end on the closing line. | "So the next time a model answers you, remember: it learned to speak from a filtered, deduplicated echo of the open web. We built this to make that invisible dataset something you can actually *see*, and explore yourself." |
| **1:52-2:00** | End card: title, live URL, "COM-480 EPFL". | "Decanting the Web. Thanks for watching." |

---

## Highlights

- The **funnel reveal** is the signature moment of the piece.
- Interactions demonstrated: the linear / log toggle on the length histogram, the domain-galaxy search and category filter, and the Lorenz / token-coverage toggle.
- One concrete figure per scene: 100T to 15T tokens, a median near 340 tokens, about 300 domains for a quarter of all tokens, and 92% of documents scoring at least 0.95.
