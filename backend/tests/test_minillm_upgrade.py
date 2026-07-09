import pytest
import os
import torch
from backend.models.mini_llm import MiniLLM, MiniTransformer, yield_retrain_mini_llm, MINI_LLM_WEIGHTS_PATH

@pytest.mark.skip(reason="Too slow")
def test_lstm_training():
    epochs = 2
    losses = []
    model_instance = None
    for ep, loss in yield_retrain_mini_llm(epochs=epochs, architecture="LSTM"):
        if ep > 0:
            losses.append(loss)
        elif ep == -2:
            model_instance = loss
    
    assert len(losses) == epochs
    assert isinstance(model_instance, MiniLLM)

@pytest.mark.skip(reason="Too slow")
def test_transformer_training():
    epochs = 2
    losses = []
    model_instance = None
    for ep, loss in yield_retrain_mini_llm(epochs=epochs, architecture="Transformer"):
        if ep > 0:
            losses.append(loss)
        elif ep == -2:
            model_instance = loss
            
    assert len(losses) == epochs
    assert isinstance(model_instance, MiniTransformer)

@pytest.mark.skip(reason="Too slow")
def test_custom_corpus_training():
    epochs = 2
    custom_corpus = ["the machine learning model is fast", "fast python code is good"]
    losses = []
    for ep, loss in yield_retrain_mini_llm(epochs=epochs, architecture="LSTM", custom_corpus=custom_corpus):
        if ep > 0:
            losses.append(loss)
            
    assert len(losses) == epochs

@pytest.mark.skip(reason="Too slow")
def test_checkpointing():
    # Remove any existing checkpoint
    if os.path.exists(MINI_LLM_WEIGHTS_PATH):
        os.remove(MINI_LLM_WEIGHTS_PATH)
        
    epochs = 12
    for ep, loss in yield_retrain_mini_llm(epochs=epochs, architecture="LSTM"):
        pass
        
    # Checkpoint should have been saved at epoch 10 and at the end.
    assert os.path.exists(MINI_LLM_WEIGHTS_PATH)
    
    # Test resume
    for ep, loss in yield_retrain_mini_llm(epochs=2, architecture="LSTM", resume_from_checkpoint=True):
        pass
    assert os.path.exists(MINI_LLM_WEIGHTS_PATH)
