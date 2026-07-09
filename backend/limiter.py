from slowapi import Limiter
from slowapi.util import get_remote_address

# Define the global rate limiter using the remote address as the key
limiter = Limiter(key_func=get_remote_address)
