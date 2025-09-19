import time
import threading


class LoadingSpinner:
    """Simple loading spinner for indicating processing"""

    def __init__(self):
        self.spinning = False
        self.thread = None
        self.spinner_chars = ["·", "✢", "✳", "✻"]
        self.current = 0

    def spin(self):
        """Animation loop for spinner"""
        # Print initial blank line for spinner
        print("\n", end="")
        while self.spinning:
            # Move up, clear line, print spinner
            print(f"\033[1A\033[2K{self.spinner_chars[self.current]} Thinking...")
            self.current = (self.current + 1) % len(self.spinner_chars)
            time.sleep(0.1)
        # Move up and clear the spinner line
        print("\033[1A\033[2K", end="")

    def start(self):
        """Start the spinner in a separate thread"""
        if not self.spinning:
            self.spinning = True
            self.thread = threading.Thread(target=self.spin)
            self.thread.daemon = True
            self.thread.start()

    def stop(self):
        """Stop the spinner"""
        if self.spinning:
            self.spinning = False
            if self.thread:
                self.thread.join(timeout=0.5)
