import os
import json
import requests
from feedparser import parse

# Load secrets
RAINDROP_IO_API_TOKEN = os.environ['RAINDROP_IO_API_TOKEN']
RSS_FEEDS = os.environ['RSS_FEEDS'].split(',')

# Set up Raindrop.io API endpoint
RAINDROP_IO_API_ENDPOINT = 'https://api.raindrop.io/rest/v1'

# Authenticate with Raindrop.io API
headers = {
    'Authorization': f'Bearer {RAINDROP_IO_API_TOKEN}',
    'Content-Type': 'application/json'
}

# Loop through RSS feeds
for feed_url in RSS_FEEDS:
    # Parse RSS feed
    feed = parse(feed_url)

    # Loop through feed entries
    for entry in feed.entries:
        # Check if entry is new
        if not check_if_entry_exists(entry.link):
            # Add entry to Raindrop.io
            add_entry_to_raindrop_io(entry)

def check_if_entry_exists(link):
    # TO DO: implement logic to check if entry exists in Raindrop.io
    pass

def add_entry_to_raindrop_io(entry):
    # Create payload for Raindrop.io API
    payload = {
        'link': entry.link,
        'title': entry.title,
        'description': entry.description,
        'tags': ['rss-import']
    }

    # Send request to Raindrop.io API
    response = requests.post(f'{RAINDROP_IO_API_ENDPOINT}/items', headers=headers, json=payload)

    # Check if request was successful
    if response.status_code == 201:
        print(f'Added {entry.title} to Raindrop.io')
    else:
        print(f'Failed to add {entry.title} to Raindrop.io')