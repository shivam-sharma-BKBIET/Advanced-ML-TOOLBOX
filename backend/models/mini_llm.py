import torch
import torch.nn as nn
import torch.nn.functional as F
import logging
import random
import math

logger = logging.getLogger(__name__)

# =============================================================================
# VOCABULARY — 150+ domain-relevant words covering tech, ML, data science,
# programming, and general English connectives. Wide enough that the model
# can produce meaningfully varied sentences for different prompts.
# =============================================================================
VOCAB_WORDS = [
    # Special tokens
    "[PAD]", "[UNK]", "[CLS]", "[SEP]",
    # Articles / determiners
    "the", "a", "an", "this", "that", "these", "those", "its", "their",
    # Pronouns
    "it", "we", "they", "you", "i", "he", "she",
    # Verbs (common)
    "is", "are", "was", "were", "be", "been", "have", "has", "had",
    "do", "does", "did", "will", "can", "could", "should", "would", "may",
    "make", "use", "run", "build", "train", "test", "learn", "improve",
    "analyze", "generate", "predict", "process", "compute", "optimize",
    "detect", "classify", "cluster", "evaluate", "deploy", "automate",
    "visualize", "simulate", "create", "design", "implement", "solve",
    "help", "enable", "support", "provide", "handle", "manage",
    # Adjectives
    "fast", "slow", "accurate", "powerful", "advanced", "modern", "deep",
    "large", "small", "high", "low", "real", "virtual", "intelligent",
    "efficient", "scalable", "robust", "complex", "simple", "dynamic",
    "interactive", "automated", "structured", "unstructured", "supervised",
    "unsupervised", "pretrained", "custom", "flexible", "reliable",
    # Nouns — ML / AI
    "model", "network", "layer", "weight", "gradient", "loss", "accuracy",
    "epoch", "batch", "tensor", "vector", "embedding", "attention",
    "transformer", "lstm", "rnn", "cnn", "neuron", "activation",
    "backpropagation", "optimizer", "dataset", "feature", "label",
    "prediction", "classification", "regression", "clustering",
    "overfitting", "underfitting", "dropout", "regularization",
    # Nouns — Software / Coding
    "python", "code", "function", "algorithm", "variable", "parameter",
    "pipeline", "api", "server", "database", "query", "module",
    "framework", "library", "package", "script", "output", "input",
    "token", "sequence", "prompt", "context", "response", "request",
    "fastapi", "react", "pytorch", "tensorflow", "sklearn",
    # Nouns — Data Science
    "data", "signal", "pattern", "distribution", "probability", "statistics",
    "matrix", "graph", "chart", "visualization", "dashboard", "report",
    "insight", "trend", "forecast", "analysis", "performance", "metric",
    "precision", "recall", "score", "result", "experiment",
    # Nouns — General
    "machine", "learning", "intelligence", "automation", "system",
    "task", "process", "step", "solution", "research", "science",
    "technology", "future", "industry", "business", "application",
    "simulation", "generation", "language", "natural", "text", "speech",
    # Prepositions / Conjunctions / Adverbs
    "in", "on", "at", "by", "for", "with", "of", "to", "from", "into",
    "and", "or", "but", "so", "because", "when", "how", "what",
    "not", "very", "highly", "quickly", "efficiently", "effectively",
    "also", "then", "while", "during", "through", "using", "based",
]

# Deduplicate while preserving order
_seen = set()
VOCAB = []
for w in VOCAB_WORDS:
    if w not in _seen:
        _seen.add(w)
        VOCAB.append(w)

WORD2ID = {w: i for i, w in enumerate(VOCAB)}
ID2WORD = {i: w for i, w in enumerate(VOCAB)}
VOCAB_SIZE = len(VOCAB)

logger.info(f"MiniLLM vocabulary size: {VOCAB_SIZE}")


def _encode(text: str) -> list[int]:
    """Tokenize text into vocabulary IDs."""
    tokens = text.lower().strip().split()
    ids = [WORD2ID["[CLS]"]]
    for t in tokens:
        # Strip punctuation from token
        clean = t.strip(".,!?;:\"'()")
        ids.append(WORD2ID.get(clean, WORD2ID["[UNK]"]))
    ids.append(WORD2ID["[SEP]"])
    return ids


def _decode(ids: list[int], skip_special: bool = True) -> str:
    """Convert IDs back to words."""
    words = []
    special = {"[PAD]", "[UNK]", "[CLS]", "[SEP]"}
    for i in ids:
        w = ID2WORD.get(i, "[UNK]")
        if skip_special and w in special:
            continue
        words.append(w)
    return " ".join(words)


# =============================================================================
# TRAINING CORPUS — 30 diverse sentences covering multiple tech topics.
# Diversity here is what makes the model respond differently to different prompts.
# =============================================================================
CORPUS = [
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
    # Machine Learning
    "machine learning is a powerful technique used to train models on data.",
    "deep learning uses neural networks to detect patterns and classify data accurately.",
    "the model learns from labeled data to make accurate predictions on new input.",
    "training a neural network requires computing gradients and optimizing the loss function.",
    "supervised learning requires labeled data to train classification and regression models.",
    "unsupervised learning can cluster and analyze data without any labeled examples.",
    "overfitting occurs when a model learns the training data too well and fails to generalize.",
    "regularization and dropout help prevent overfitting in deep neural networks.",
    "the accuracy of a machine learning model depends on the quality of the training data.",
    "gradient descent is an optimization algorithm used to minimize the loss function.",
    # Python / Coding
    "python is a simple and powerful programming language used for data science and automation.",
    "a function in python takes input parameters and returns a computed output value.",
    "the python library sklearn provides tools for building machine learning pipelines.",
    "pytorch is a flexible deep learning framework that uses dynamic computation graphs.",
    "tensorflow and pytorch are the two most popular deep learning frameworks available.",
    "using fastapi you can build fast and scalable backend api services with python.",
    "code should be efficient, readable, and well-structured to support long-term maintenance.",
    # Data Science / Analytics
    "data science combines statistics, programming, and domain knowledge to extract insights.",
    "a data pipeline processes raw input data and transforms it into structured features.",
    "visualization tools like charts and graphs help communicate data insights effectively.",
    "the dashboard provides real-time analysis and interactive visualization of complex data.",
    "feature engineering is a critical step in building high-performance prediction models.",
    "the distribution of data determines which machine learning algorithm will perform best.",
    # AI / Automation / LLM
    "large language models generate text by predicting the next token in a sequence.",
    "the lstm network processes sequential data and learns long-range dependencies in text.",
    "artificial intelligence will automate complex business tasks and improve efficiency.",
    "natural language processing enables machines to understand and generate human text.",
    "the simulation generates tokens step by step using a trained lstm neural network.",
    "a token is the smallest unit of text that a language model processes and generates.",
    "attention mechanisms help transformers focus on the most relevant parts of the input.",
]


# =============================================================================
# MODEL ARCHITECTURE — Embedding → 2-layer LSTM → Linear projection
# Two LSTM layers give the model enough capacity to capture n-gram patterns.
# =============================================================================
class MiniLLM(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int = 64, hidden_dim: int = 256):
        super().__init__()
        self.vocab_size = vocab_size
        self.embedding  = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm        = nn.LSTM(embed_dim, hidden_dim, num_layers=2,
                                   batch_first=True, dropout=0.2)
        self.fc          = nn.Linear(hidden_dim, vocab_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        embeds   = self.embedding(x)          # [B, T, E]
        out, _   = self.lstm(embeds)          # [B, T, H]
        logits   = self.fc(out)               # [B, T, V]
        return logits

class PositionalEncoding(nn.Module):
    def __init__(self, d_model: int, max_len: int = 5000):
        super().__init__()
        position = torch.arange(max_len).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2) * (-math.log(10000.0) / d_model))
        pe = torch.zeros(max_len, 1, d_model)
        pe[:, 0, 0::2] = torch.sin(position * div_term)
        pe[:, 0, 1::2] = torch.cos(position * div_term)
        self.register_buffer('pe', pe)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = x + self.pe[:x.size(1)].transpose(0, 1)
        return x

class MiniTransformer(nn.Module):
    def __init__(self, vocab_size: int, embed_dim: int = 64, num_heads: int = 4, hidden_dim: int = 256):
        super().__init__()
        self.vocab_size = vocab_size
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.pos_encoder = PositionalEncoding(embed_dim)
        encoder_layers = nn.TransformerEncoderLayer(d_model=embed_dim, nhead=num_heads, dim_feedforward=hidden_dim, dropout=0.2, batch_first=True)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layers, num_layers=1)
        self.fc = nn.Linear(embed_dim, vocab_size)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        seq_len = x.size(1)
        mask = nn.Transformer.generate_square_subsequent_mask(seq_len).to(x.device)
        
        embeds = self.embedding(x) * math.sqrt(64)
        embeds = self.pos_encoder(embeds)
        
        out = self.transformer_encoder(embeds, mask=mask, is_causal=True)
        logits = self.fc(out)
        return logits


# =============================================================================
# TRAINING — 80 epochs on the 30-sentence corpus.
# Adam optimizer with a schedule drop at epoch 50.
# =============================================================================
import os
from backend.config import settings

MINI_LLM_WEIGHTS_PATH = os.path.join(settings.MODEL_DIR, "mini_llm.pt")

model = MiniLLM(VOCAB_SIZE)

def _train_and_save_llm():
    logger.info("Training MiniLLM on extended corpus (80 epochs)...")
    torch.manual_seed(42)
    optimizer = torch.optim.Adam(model.parameters(), lr=5e-3)
    criterion = nn.CrossEntropyLoss(ignore_index=0)
    
    model.train()
    for epoch in range(80):
        if epoch == 50:
            for pg in optimizer.param_groups:
                pg["lr"] = 1e-3  # LR decay for fine-tuning
    
        for text in CORPUS:
            ids = _encode(text)
            if len(ids) < 2:
                continue
            x = torch.tensor([ids[:-1]], dtype=torch.long)
            y = torch.tensor([ids[1:]],  dtype=torch.long)
            optimizer.zero_grad()
            logits = model(x)                              # [1, T-1, V]
            loss   = criterion(logits.view(-1, VOCAB_SIZE), y.view(-1))
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
    
    model.eval()
    logger.info("✅ MiniLLM training complete.")
    try:
        os.makedirs(os.path.dirname(MINI_LLM_WEIGHTS_PATH), exist_ok=True)
        temp_path = MINI_LLM_WEIGHTS_PATH + ".tmp"
        torch.save(model.state_dict(), temp_path)
        if os.path.exists(MINI_LLM_WEIGHTS_PATH):
            os.remove(MINI_LLM_WEIGHTS_PATH)
        os.rename(temp_path, MINI_LLM_WEIGHTS_PATH)
        logger.info(f"Saved trained MiniLLM weights to {MINI_LLM_WEIGHTS_PATH}")
    except Exception as e:
        logger.error(f"Failed to save MiniLLM weights: {e}")

if os.path.exists(MINI_LLM_WEIGHTS_PATH):
    logger.info(f"Loading cached MiniLLM weights from {MINI_LLM_WEIGHTS_PATH}")
    try:
        model.load_state_dict(torch.load(MINI_LLM_WEIGHTS_PATH, map_location="cpu"))
        model.eval()
    except Exception as e:
        logger.error(f"Failed to load MiniLLM weights: {e}, retraining...")
        _train_and_save_llm()
else:
    _train_and_save_llm()


# =============================================================================
# INFERENCE — Temperature-based sampling (NOT argmax).
#
# How temperature works:
#   temperature < 1.0  → sharper distribution → more confident / repetitive
#   temperature = 1.0  → raw model distribution
#   temperature > 1.0  → flatter distribution → more diverse / creative
#
# We use temperature=0.85 + top-k=20 sampling so:
#   - Different prompts produce genuinely different outputs
#   - Output is still coherent (not pure random noise)
# =============================================================================
_SKIP_IDS = {
    WORD2ID["[PAD]"],
    WORD2ID["[UNK]"],
    WORD2ID["[CLS]"],
    WORD2ID["[SEP]"],
}


def _sample_next_token(logits: torch.Tensor,
                        temperature: float = 0.85,
                        top_k: int = 30) -> int:
    """
    Sample next token id using temperature + top-k filtering.
    Special tokens ([UNK], [PAD], [CLS], [SEP]) are masked out so the
    model never generates them as predicted words.
    """
    logits = logits.clone() / max(temperature, 1e-8)

    # Mask out special/unknown tokens with -inf so softmax zeroes them
    for sid in _SKIP_IDS:
        logits[sid] = float("-inf")

    # Keep only top-k candidates from remaining
    top_vals, top_idx = torch.topk(logits, min(top_k, logits.size(-1)))
    probs = F.softmax(top_vals, dim=-1)
    chosen = torch.multinomial(probs, num_samples=1).item()
    return int(top_idx[chosen].item())


def simulate_token_generation(prompt: str, max_new_tokens: int = 12,
                               temperature: float = 0.85):
    """
    Simulate token-by-token generation using the trained MiniLLM.

    Returns a dict with:
      - prompt          : original input
      - final_output    : full decoded string (prompt + generated tokens)
      - steps           : list of per-step dicts with top-5 distribution
    """
    # Encode prompt (strip trailing [SEP] so we can keep generating)
    input_ids = _encode(prompt)
    sep_id    = WORD2ID["[SEP]"]
    if input_ids and input_ids[-1] == sep_id:
        input_ids = input_ids[:-1]

    generated_ids = list(input_ids)
    steps         = []

    try:
        from backend.model_registry import model_registry
        reg_model = model_registry.get_model("mini_llm")
    except Exception:
        reg_model = None

    active_model = reg_model if reg_model is not None else model

    with torch.no_grad():
        for _ in range(max_new_tokens):
            seq_tensor = torch.tensor([generated_ids[-16:]], dtype=torch.long)
            logits     = active_model(seq_tensor)            # [1, T, V]
            last_logits = logits[0, -1, :]            # [V]

            # Probability distribution for display — mask out special tokens
            masked_logits = last_logits.clone()
            for sid in _SKIP_IDS:
                masked_logits[sid] = float("-inf")
            display_probs = F.softmax(masked_logits, dim=-1)
            top_vals, top_idx = torch.topk(display_probs, min(10, VOCAB_SIZE))

            top_5 = []
            for val, idx in zip(top_vals.tolist(), top_idx.tolist()):
                tok_str = ID2WORD.get(int(idx), "")
                if not tok_str or tok_str in {"[PAD]", "[UNK]", "[CLS]", "[SEP]"}:
                    continue
                top_5.append({
                    "token":       tok_str,
                    "id":          int(idx),
                    "probability": round(float(val), 4)
                })
                if len(top_5) == 5:
                    break

            # Sample next token (temperature sampling — NOT argmax)
            next_id = _sample_next_token(last_logits, temperature=temperature)
            next_token_str = ID2WORD.get(next_id, f"[{next_id}]")

            # Stop if we hit [SEP]
            if next_token_str == "[SEP]":
                break

            # Build step record
            steps.append({
                "input_so_far":   _decode(generated_ids),
                "predicted_token": next_token_str,
                "predicted_id":    next_id,
                "top_5":           top_5
            })

            generated_ids.append(next_id)

    final_output = _decode(generated_ids)

    return {
        "prompt":       prompt,
        "final_output": final_output,
        "steps":        steps
    }


def yield_retrain_mini_llm(epochs: int = 50, architecture: str = "LSTM", custom_corpus: list[str] = None, resume_from_checkpoint: bool = False):
    """
    Generator that trains the MiniLLM on the training corpus for a custom number of epochs.
    Yields (epoch, loss) values epoch-by-epoch.
    """
    global model
    logger.info(f"Retraining MiniLLM for {epochs} epochs, Arch: {architecture}...")
    torch.manual_seed(42)
    
    if architecture == "Transformer":
        new_model = MiniTransformer(VOCAB_SIZE)
    else:
        new_model = MiniLLM(VOCAB_SIZE)
        
    if resume_from_checkpoint:
        if os.path.exists(MINI_LLM_WEIGHTS_PATH):
            try:
                new_model.load_state_dict(torch.load(MINI_LLM_WEIGHTS_PATH, map_location="cpu"))
                logger.info("Resumed from checkpoint successfully.")
            except Exception as e:
                logger.warning(f"Failed to load checkpoint: {e}")
                
    optimizer = torch.optim.Adam(new_model.parameters(), lr=5e-3)
    criterion = nn.CrossEntropyLoss(ignore_index=0)
    
    train_data = custom_corpus if custom_corpus and len(custom_corpus) > 0 else CORPUS
    
    new_model.train()
    for epoch in range(epochs):
        # LR decay at 60% of total epochs
        if epoch == int(epochs * 0.6):
            for pg in optimizer.param_groups:
                pg["lr"] = 1e-3
                
        epoch_loss = 0.0
        count = 0
        for text in train_data:
            ids = _encode(text)
            if len(ids) < 2:
                continue
            x = torch.tensor([ids[:-1]], dtype=torch.long)
            y = torch.tensor([ids[1:]],  dtype=torch.long)
            
            optimizer.zero_grad()
            logits = new_model(x)
            loss   = criterion(logits.view(-1, VOCAB_SIZE), y.view(-1))
            loss.backward()
            torch.nn.utils.clip_grad_norm_(new_model.parameters(), 1.0)
            optimizer.step()
            
            epoch_loss += loss.item()
            count += 1
            
        if count > 0:
            avg_loss = epoch_loss / count
            yield epoch + 1, round(avg_loss, 4)
            
            # Save periodic checkpoints
            if (epoch + 1) % 10 == 0:
                try:
                    os.makedirs(os.path.dirname(MINI_LLM_WEIGHTS_PATH), exist_ok=True)
                    torch.save(new_model.state_dict(), MINI_LLM_WEIGHTS_PATH)
                except Exception:
                    pass
            
    new_model.eval()
    yield -2, new_model
    try:
        os.makedirs(os.path.dirname(MINI_LLM_WEIGHTS_PATH), exist_ok=True)
        temp_path = MINI_LLM_WEIGHTS_PATH + ".tmp"
        torch.save(new_model.state_dict(), temp_path)
        if os.path.exists(MINI_LLM_WEIGHTS_PATH):
            os.remove(MINI_LLM_WEIGHTS_PATH)
        os.rename(temp_path, MINI_LLM_WEIGHTS_PATH)
        logger.info(f"Saved retrained MiniLLM weights to {MINI_LLM_WEIGHTS_PATH}")
    except Exception as e:
        logger.error(f"Failed to save retrained MiniLLM weights: {e}")
    model = new_model
    logger.info("✅ MiniLLM retraining complete and weights updated.")

def retrain_mini_llm(epochs: int = 50, architecture: str = "LSTM", custom_corpus: list[str] = None, resume_from_checkpoint: bool = False):
    """
    Retrains the MiniLLM on the training corpus for a custom number of epochs.
    Returns the epoch-by-epoch cross-entropy loss history and the model instance.
    """
    loss_history = []
    model_instance = None
    for ep, loss_val in yield_retrain_mini_llm(epochs, architecture, custom_corpus, resume_from_checkpoint):
        if ep == -2:
            model_instance = loss_val
        else:
            loss_history.append({
                "epoch": ep,
                "loss": loss_val
            })
    return loss_history, model_instance
