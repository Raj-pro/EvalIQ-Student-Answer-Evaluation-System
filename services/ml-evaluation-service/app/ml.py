import re
from typing import Dict

import numpy as np
from sentence_transformers import SentenceTransformer

# Model is downloaded once at import time and cached inside the container.
# all-MiniLM-L6-v2: 80 MB, 384-dim embeddings, ~14k sentences/sec on CPU.
_model = SentenceTransformer("all-MiniLM-L6-v2")

_word_re = re.compile(r"[a-z0-9]+")


def _keywords(text: str) -> set:
    return set(_word_re.findall(text.lower()))


def keyword_overlap(a: str, b: str) -> float:
    """Jaccard index on raw word sets — fast lexical signal."""
    sa, sb = _keywords(a), _keywords(b)
    if not sa and not sb:
        return 1.0
    if not sa or not sb:
        return 0.0
    return len(sa & sb) / len(sa | sb)


def length_ratio(a: str, b: str) -> float:
    la, lb = max(len(a.split()), 1), max(len(b.split()), 1)
    return min(la, lb) / max(la, lb)


def similarity_features(expected: str, student: str) -> Dict[str, float]:
    # Semantic similarity via sentence embeddings
    emb_exp, emb_stu = _model.encode([expected, student], normalize_embeddings=True)
    cosine = float(np.dot(emb_exp, emb_stu))          # cosine sim on L2-normalised vecs
    cosine = max(0.0, cosine)                          # clamp negatives to 0

    overlap   = keyword_overlap(expected, student)
    len_ratio = length_ratio(expected, student)

    return {
        "cosine_similarity": cosine,
        "keyword_overlap":   overlap,
        "length_ratio":      len_ratio,
        # kept for schema compatibility
        "euclidean_distance": 0.0,
        "manhattan_distance": 0.0,
    }


def predict_score(features: Dict[str, float]) -> float:
    """
    Score = 10 × [ 0.80 × semantic_cosine
                 + 0.20 × keyword_overlap ]
                 × length_penalty

    Semantic cosine dominates; keyword overlap catches exact-term matches
    the embedding might smooth over; length penalty discourages one-word answers.
    """
    cosine    = float(features.get("cosine_similarity", 0.0))
    overlap   = float(features.get("keyword_overlap",   0.0))
    len_ratio = float(features.get("length_ratio",      0.0))

    base        = (0.80 * cosine) + (0.20 * overlap)
    length_pen  = 0.6 + 0.4 * len_ratio          # range 0.6 – 1.0
    score       = 10.0 * base * length_pen

    return float(max(0.0, min(10.0, score)))
