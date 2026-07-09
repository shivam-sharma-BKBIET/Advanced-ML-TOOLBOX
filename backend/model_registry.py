import os
import joblib
import threading
import logging
from backend.config import settings

logger = logging.getLogger(__name__)

class ModelRegistry:
    def __init__(self):
        self._lock = threading.RLock()
        self._models = {}
        self._versions = {}

    def get_model(self, model_name: str):
        """Retrieve a cached model under a read-lock."""
        with self._lock:
            return self._models.get(model_name)

    def get_version(self, model_name: str):
        """Retrieve the currently active version tag for a model."""
        with self._lock:
            return self._versions.get(model_name)

    def set_model(self, model_name: str, model_instance, version: str = None, save_path: str = None, version_path: str = None):
        """Cache a model under a write-lock and dump to disk atomically."""
        with self._lock:
            self._models[model_name] = model_instance
            if version is not None:
                self._versions[model_name] = version
            
            # Atomic file system write: write to temp file first, then rename
            if save_path and model_instance is not None:
                temp_path = save_path + ".tmp"
                try:
                    os.makedirs(os.path.dirname(save_path), exist_ok=True)
                    joblib.dump(model_instance, temp_path)
                    # Windows requires removing the destination if it exists before renaming
                    if os.path.exists(save_path):
                        os.remove(save_path)
                    os.rename(temp_path, save_path)
                    logger.info(f"Successfully saved {model_name} model to {save_path}")
                except Exception as e:
                    logger.error(f"Failed to write model {model_name} to disk: {e}", exc_info=True)
                    if os.path.exists(temp_path):
                        try:
                            os.remove(temp_path)
                        except Exception:
                            pass
            
            if version_path and version is not None:
                temp_v_path = version_path + ".tmp"
                try:
                    with open(temp_v_path, "w") as f:
                        f.write(version)
                    if os.path.exists(version_path):
                        os.remove(version_path)
                    os.rename(temp_v_path, version_path)
                except Exception as e:
                    logger.error(f"Failed to write version for {model_name} to disk: {e}", exc_info=True)
                    if os.path.exists(temp_v_path):
                        try:
                            os.remove(temp_v_path)
                        except Exception:
                            pass

    def load_model_from_disk(self, model_name: str, save_path: str, version_path: str, expected_version: str):
        """Attempt to load a model from disk if it exists and versions match."""
        with self._lock:
            try:
                if os.path.exists(save_path) and os.path.exists(version_path):
                    with open(version_path, "r") as f:
                        version = f.read().strip()
                    if version == expected_version:
                        model = joblib.load(save_path)
                        self._models[model_name] = model
                        self._versions[model_name] = version
                        logger.info(f"Loaded cached {model_name} model (version {version})")
                        return model
            except Exception as e:
                logger.error(f"Error loading cached {model_name} model: {e}", exc_info=True)
            return None

# Global registry instance
model_registry = ModelRegistry()
