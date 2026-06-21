import threading
import asyncio

class Celery:
    def __init__(self, name=None, broker=None, backend=None, **kwargs):
        self.name = name
        self.broker = broker
        
    def task(self, *args, **kwargs):
        if len(args) == 1 and callable(args[0]):
            func = args[0]
            return CeleryTask(func)
        def decorator(func):
            return CeleryTask(func)
        return decorator

class CeleryTask:
    def __init__(self, func):
        self.func = func
        
    def __call__(self, *args, **kwargs):
        return self.func(*args, **kwargs)
        
    def delay(self, *args, **kwargs):
        t = threading.Thread(target=self._run_task, args=args, kwargs=kwargs)
        t.daemon = True
        t.start()
        return CeleryResult()
        
    def apply_async(self, args=None, kwargs=None, **other_kwargs):
        args = args or ()
        kwargs = kwargs or {}
        t = threading.Thread(target=self._run_task, args=args, kwargs=kwargs)
        t.daemon = True
        t.start()
        return CeleryResult()
        
    def _run_task(self, *args, **kwargs):
        try:
            if asyncio.iscoroutinefunction(self.func):
                asyncio.run(self.func(*args, **kwargs))
            else:
                self.func(*args, **kwargs)
        except Exception as e:
            print(f"[Celery Mock Task Error] {e}")

class CeleryResult:
    def get(self, timeout=None):
        return None
