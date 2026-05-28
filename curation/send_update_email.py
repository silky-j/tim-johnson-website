#!/usr/bin/env python3
"""
Sends a weekly-refresh summary email via Gmail SMTP.
Credentials are read from curation/.env (never committed).

Usage (called by weekly_refresh.sh):
  python3 curation/send_update_email.py \
    --pub-before 308 --pub-after 310 \
    --news-before 19 --news-after 22
"""
import argparse
import json
import os
import smtplib
import ssl
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

REPO = Path(__file__).parent.parent
GRAPH_DATA = REPO / "assets" / "data" / "graph_data.json"
BOOKS_DATA = REPO / "assets" / "js" / "books-data.js"
ENV_FILE = Path(__file__).parent / ".env"

SITE_URL = "https://silky-j.github.io/tim-johnson-website/"


def load_env():
    """Load .env file into os.environ if it exists."""
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())


def get_recent_pubs(n=3):
    try:
        with open(GRAPH_DATA) as f:
            data = json.load(f)
        pubs = sorted(data["publications"], key=lambda p: p.get("year", 0), reverse=True)
        return [
            f"{p.get('title', 'Untitled')} ({p.get('year', '?')})"
            for p in pubs[:n]
        ]
    except Exception:
        return []


def get_book_count():
    import re
    try:
        content = BOOKS_DATA.read_text()
        return len(re.findall(r"\{\s*year\s*:", content))
    except Exception:
        return "?"


def build_email(pub_before, pub_after, news_before, news_after):
    today = date.today().isoformat()
    pub_delta = pub_after - pub_before
    news_delta = news_after - news_before
    total_new = pub_delta + news_delta
    book_count = get_book_count()
    recent_pubs = get_recent_pubs()

    if total_new > 0:
        subject = f"Tim Johnson site — weekly update {today} (+{total_new} item{'s' if total_new != 1 else ''})"
    else:
        subject = f"Tim Johnson site — weekly update {today} (no changes)"

    def delta_str(delta):
        if delta > 0:
            return f" <span style='color:#0d9488'>(+{delta} new)</span>"
        return ""

    recent_html = ""
    if recent_pubs:
        items = "".join(f"<li>{p}</li>" for p in recent_pubs)
        recent_html = f"""
        <h3 style="margin:16px 0 6px; font-size:14px; color:#374151;">Most recent publications</h3>
        <ul style="margin:0; padding-left:20px; color:#6b7280; font-size:13px;">{items}</ul>
        """

    no_changes_note = ""
    if total_new == 0:
        no_changes_note = (
            "<p style='color:#6b7280; font-style:italic;'>No new publications or news items were detected this run.</p>"
        )

    html_body = f"""
    <html><body style="font-family:Inter,sans-serif; max-width:520px; margin:0 auto; padding:24px; color:#1f2937;">
      <h2 style="color:#7c3aed; margin-bottom:4px;">Tim Johnson site — weekly update</h2>
      <p style="color:#6b7280; font-size:13px; margin-top:0;">{today}</p>
      {no_changes_note}
      <table style="width:100%; border-collapse:collapse; margin:16px 0;">
        <tr style="background:#f3f4f6;">
          <td style="padding:8px 12px; font-weight:600;">Publications</td>
          <td style="padding:8px 12px;">{pub_after}{delta_str(pub_delta)}</td>
        </tr>
        <tr>
          <td style="padding:8px 12px; font-weight:600;">Books &amp; Chapters</td>
          <td style="padding:8px 12px;">{book_count}</td>
        </tr>
        <tr style="background:#f3f4f6;">
          <td style="padding:8px 12px; font-weight:600;">News items</td>
          <td style="padding:8px 12px;">{news_after}{delta_str(news_delta)}</td>
        </tr>
      </table>
      {recent_html}
      <p style="margin-top:20px;">
        <a href="{SITE_URL}" style="color:#7c3aed;">View live site →</a>
      </p>
      <hr style="border:none; border-top:1px solid #e5e7eb; margin-top:24px;">
      <p style="font-size:11px; color:#9ca3af;">Sent by weekly_refresh.sh · tim-johnson-website</p>
    </body></html>
    """

    plain_body = (
        f"Tim Johnson site — weekly update {today}\n\n"
        f"Publications:      {pub_after}" + (f" (+{pub_delta} new)" if pub_delta else "") + "\n"
        f"Books & Chapters:  {book_count}\n"
        f"News items:        {news_after}" + (f" (+{news_delta} new)" if news_delta else "") + "\n"
        + ("\nMost recent publications:\n" + "\n".join(f"  • {p}" for p in recent_pubs) if recent_pubs else "")
        + f"\n\nLive site: {SITE_URL}\n"
    )

    return subject, plain_body, html_body


def send(subject, plain_body, html_body):
    gmail_user = os.environ.get("GMAIL_USER", "")
    app_password = os.environ.get("GMAIL_APP_PASSWORD", "")
    notify_email = os.environ.get("NOTIFY_EMAIL", "")
    notify_recipients = [a.strip() for a in notify_email.split(",") if a.strip()]

    placeholder = {"", "your@email.com", "your-gmail@gmail.com", "xxxx-xxxx-xxxx-xxxx"}
    if not all([gmail_user, app_password, notify_email]) or any(
        v in placeholder for v in [gmail_user, app_password, notify_email]
    ):
        print(
            "send_update_email: credentials not configured in curation/.env — skipping email.\n"
            "  Fill in GMAIL_USER, GMAIL_APP_PASSWORD, and NOTIFY_EMAIL.",
            flush=True,
        )
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = gmail_user
    msg["To"] = ", ".join(notify_recipients)
    msg.attach(MIMEText(plain_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        ctx = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=ctx) as server:
            server.login(gmail_user, app_password)
            server.sendmail(gmail_user, notify_recipients, msg.as_string())
        print(f"send_update_email: notification sent to {', '.join(notify_recipients)}", flush=True)
    except smtplib.SMTPAuthenticationError:
        print(
            "send_update_email: Gmail authentication failed.\n"
            "  Check GMAIL_APP_PASSWORD in curation/.env.\n"
            "  Generate one at: myaccount.google.com → Security → App Passwords",
            flush=True,
        )
    except Exception as exc:
        print(f"send_update_email: failed to send — {exc}", flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pub-before", type=int, default=0)
    parser.add_argument("--pub-after", type=int, default=0)
    parser.add_argument("--news-before", type=int, default=0)
    parser.add_argument("--news-after", type=int, default=0)
    args = parser.parse_args()

    load_env()
    subject, plain, html = build_email(
        args.pub_before, args.pub_after,
        args.news_before, args.news_after,
    )
    send(subject, plain, html)


if __name__ == "__main__":
    main()
