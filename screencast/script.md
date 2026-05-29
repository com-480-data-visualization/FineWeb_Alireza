# 🎥 Screencast script & storyboard: "Decanting the Web"

**Target length:** ≤ 2:00 (hard limit). **Aim for 1:50** to leave a safety margin.
**Goal (per rubric):** show what the viz *does* in a fun, engaging, impactful way, and talk about **contributions and insights**, *not* technical details.

> Tips: record at 1920×1080, hide the browser bookmarks bar, use a clean profile, and
> pre-scroll once to warm up fonts/animations. Scroll **slowly and smoothly** (a trackpad
> or a scroll-automation tool helps). Record narration separately and lay it over the
> screen capture for clean audio.

---

## ⏱️ Beat sheet

| Time | On screen | Narration (read aloud) |
|------|-----------|------------------------|
| **0:00-0:10** | Hero section. Let the title animation breathe; cursor still. | "Every AI model is what it eats. Before it can write, it has to read, and most of what it reads comes from one dataset: **FineWeb**. This is the story of how the open web becomes AI training data." |
| **0:10-0:22** | Click **"Follow the journey"**; brief pause on the intro stats strip. | "We streamed two hundred thousand documents from FineWeb and measured them. Ninety-six snapshots of the web, seventy-thousand domains, twelve years. Here's what we found." |
| **0:22-0:42** | **Funnel.** Scroll step-by-step so stages reveal one at a time. Hover the **MinHash dedup** stage to pop the tooltip. | "It starts with the entire web: about a hundred trillion tokens of raw noise. Watch it get filtered: extract the text… keep only good English… and the biggest cut of all, remove the duplicates. What survives? Just fifteen trillion tokens. **Eighty-five percent is thrown away.**" |
| **0:42-0:56** | **Document length.** Land on linear view, then click **"Log scale"** yourself. | "How long is a typical web page? Tiny, about three hundred tokens. But flip to a log scale and the shape snaps into a clean bell. The web's documents are log-normal, with a few giant outliers carrying huge amounts of text." |
| **0:56-1:08** | **Domain galaxy.** Let bubbles settle; click a category swatch (e.g. **News**); type a domain in **search** (e.g. "wikipedia"). | "Where does all this text come from? Each bubble is a domain: news, wikis, blogs, code. You can filter by type, or search for any site… and there's Wikipedia, one of the giants." |
| **1:08-1:24** | **Concentration.** Show Lorenz curve + Gini; hover once; then click **"Token coverage."** | "But the web isn't fair. A handful of domains dominate, with a Gini of nearly point-six. In fact, just **three hundred domains** supply a quarter of *all* the text a model reads." |
| **1:24-1:38** | **Quality landscape.** Scroll so the dominant cell highlights. Hover the brightest cell. | "Cross length with language confidence and the whole dataset collapses into one bright region: confident English, medium length. That's the heart of what AI learns from." |
| **1:38-1:52** | Scroll to **takeaways** cards; slow pan across the four cards; end on the closing line. | "So the next time a model answers you, remember: it learned to speak from a filtered, deduplicated echo of the open web. We built this to make that invisible dataset something you can actually *see*, and explore yourself." |
| **1:52-2:00** | End card: title + live URL + "COM-480 EPFL". | *(silent, or)* "Decanting the Web. Thanks for watching." |

---

## 🎯 What to emphasize (contributions, not code)

- **The funnel reveal** is the signature moment, so give it room.
- Show **interactivity you built**: the log toggle, the galaxy search/filter, the Lorenz↔coverage toggle. Each click should feel effortless.
- Land **one number per scene** so the viewer leaves with concrete facts (100T→15T, ~340 tokens, 300 domains, 92% ≥0.95).
- Tone: confident, curious, a little playful. You're a guide, not a lecturer.

## ✂️ If you're over time
1. Merge the intro beat (0:10-0:22) into the hero.
2. Cut the quality-landscape beat to ~8s (it's the most technical).
3. Tighten the galaxy beat to a single search action.

## 🎙️ Production checklist
- [ ] 1080p, 30fps, clean browser, full-screen site.
- [ ] Smooth slow scrolling (consider a scroll-automation bookmarklet).
- [ ] Narration recorded separately, normalized, light noise reduction.
- [ ] Soft background music bed at ~15% volume (optional).
- [ ] Final length **≤ 2:00**. Export H.264 MP4.
- [ ] Upload (YouTube unlisted / Drive) and paste the link into the README and process book.
