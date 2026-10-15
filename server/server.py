#!/usr/bin/env python3
"""
The Sonic Media — Python Development Server with Clean URLs
Supports clean URL routing (/about -> about.html, /sonicmediaadmin -> sonicmediaadmin.html)
Redirects legacy .html requests to clean URLs.
"""

import sys
import os
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
# Project root is one level up from server/
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class CleanURLHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        pathname = urllib.parse.unquote(parsed.path)

        # 1. /index.html -> redirect 301 to /
        if pathname == '/index.html':
            self.send_response(301)
            query = f"?{parsed.query}" if parsed.query else ""
            self.send_header('Location', f"/{query}")
            self.end_headers()
            return

        # 2. Redirect *.html to clean URL
        if pathname.endswith('.html'):
            clean = pathname[:-5]
            self.send_response(301)
            query = f"?{parsed.query}" if parsed.query else ""
            self.send_header('Location', f"{clean}{query}")
            self.end_headers()
            return

        # 3. studio alias -> portfolio
        if pathname == '/studio':
            self.path = '/portfolio.html'
            return super().do_GET()

        rel_path = pathname.lstrip('/')

        # 4. Backward-compatible sample routes: /sample-* or /sweetbasket -> /samples/*.html
        if pathname.startswith('/sample-') or pathname == '/sweetbasket':
            sample_file = os.path.join(ROOT_DIR, 'samples', rel_path + '.html')
            if os.path.exists(sample_file):
                self.path = '/samples/' + rel_path + '.html'
                return super().do_GET()

        # 5. Check if pathname directly exists
        local_path = os.path.join(ROOT_DIR, rel_path)

        if os.path.isdir(local_path):
            index_path = os.path.join(local_path, 'index.html')
            if os.path.exists(index_path):
                self.path = os.path.join(pathname, 'index.html')
                return super().do_GET()

        if not os.path.exists(local_path) and os.path.exists(local_path + '.html'):
            self.path = pathname + '.html'
            return super().do_GET()

        return super().do_GET()

if __name__ == '__main__':
    os.chdir(ROOT_DIR)
    server = HTTPServer(('0.0.0.0', PORT), CleanURLHandler)
    print(f"The Sonic Media — Clean URL Python Server running at http://localhost:{PORT}/")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
