from typing import Callable

def require_module(module_name: str) -> Callable[[], None]:
    """Single-school Little Scholar School edition: all modules permanently active."""
    def module_checker() -> None:
        pass
    return module_checker
