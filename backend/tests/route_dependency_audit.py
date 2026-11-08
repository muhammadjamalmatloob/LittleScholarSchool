import sys
from pathlib import Path

root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import inspect
from backend.app.main import app

routes_list = []

def inspect_endpoint(endpoint, full_path, methods, router_deps=None):
    if router_deps is None:
        router_deps = []
    deps = list(router_deps)
    sig = inspect.signature(endpoint)
    for param_name, param in sig.parameters.items():
        if hasattr(param.default, "dependency") and param.default.dependency:
            dep_fn = param.default.dependency
            deps.append(getattr(dep_fn, "__name__", str(dep_fn)))
    
    routes_list.append({
        "method": methods[0] if methods else "GET",
        "path": full_path,
        "endpoint_name": endpoint.__name__,
        "module": endpoint.__module__,
        "deps": deps
    })

for item in app.routes:
    if hasattr(item, "methods") and hasattr(item, "path"):
        methods = [m for m in item.methods if m not in ("HEAD", "OPTIONS")]
        if methods:
            inspect_endpoint(item.endpoint, item.path, methods)
    elif "Included" in type(item).__name__:
        prefix = getattr(getattr(item, "include_context", None), "prefix", "") or ""
        orig_router = getattr(item, "original_router", None)
        router_deps = [getattr(d.call, "__name__", str(d.call)) for d in getattr(orig_router, "dependencies", [])]
        if orig_router and hasattr(orig_router, "routes"):
            for sub_route in orig_router.routes:
                if hasattr(sub_route, "methods") and hasattr(sub_route, "path"):
                    sub_methods = [m for m in sub_route.methods if m not in ("HEAD", "OPTIONS")]
                    if sub_methods:
                        sub_full_path = prefix + sub_route.path
                        # sub_route specific dependencies
                        route_deps = router_deps + [getattr(d.call, "__name__", str(d.call)) for d in getattr(sub_route, "dependencies", [])]
                        inspect_endpoint(sub_route.endpoint, sub_full_path, sub_methods, route_deps)

print("=" * 90)
print(f"COMPLETE AUDIT OF ALL {len(routes_list)} FASTAPI ENDPOINTS")
print("=" * 90)

unprotected = []
auth_only = []
role_enforced = []

for r in routes_list:
    has_role = any("role" in d.lower() or "permission" in d.lower() for d in r["deps"])
    has_auth = any("user" in d.lower() or "token" in d.lower() or "auth" in d.lower() for d in r["deps"]) or has_role
    
    if not has_auth:
        unprotected.append(r)
    elif not has_role:
        auth_only.append(r)
    else:
        role_enforced.append(r)

print(f"Role/Permission Protected Routes : {len(role_enforced)}")
print(f"Authenticated-Only Routes        : {len(auth_only)}")
print(f"Unprotected Public Routes        : {len(unprotected)}")
print("-" * 90)

print("\n--- UNPROTECTED (PUBLIC) ROUTES ---")
for r in unprotected:
    print(f"  [{r['method']:<4}] {r['path']:<50} -> {r['module']}.{r['endpoint_name']}")

print("\n--- AUTHENTICATED-ONLY (ANY AUTHENTICATED ROLE) ROUTES ---")
for r in auth_only:
    print(f"  [{r['method']:<4}] {r['path']:<50} -> {r['endpoint_name']} (deps: {r['deps']})")
