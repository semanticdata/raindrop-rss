require("dotenv").config();
const Parser = require("rss-parser");
const axios = require("axios");

// Initialize RSS parser
const parser = new Parser();

const loadConfiguration = () => {
  const token = process.env.RAINDROP_IO_API_TOKEN;
  const feeds = process.env.RSS_FEEDS;

  if (!token) {
    throw new Error("RAINDROP_IO_API_TOKEN not found in .env file");
  }
  if (!feeds) {
    throw new Error("RSS_FEEDS not found in .env file");
  }

  return {
    token,
    feeds: feeds.split(","),
  };
};

const checkIfEntryExists = async (link, headers) => {
  try {
    console.log(`Checking existence for: ${link}`);
    const response = await axios.get(
      "https://api.raindrop.io/rest/v1/raindrops/0",
      {
        headers,
        params: {
          search: `"${link}"`,
          perPage: 1,
        },
      }
    );

    console.log("Search response:", {
      status: response.status,
      count: response.data.count,
      items: response.data.items?.length || 0,
      search: `"${link}"`,
    });

    if (response.data.items?.length > 0) {
      console.log("Found existing item:", {
        title: response.data.items[0].title,
        link: response.data.items[0].link,
      });
    }

    return response.data.count > 0;
  } catch (error) {
    console.error("Error checking link existence:");
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Response error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error("Request error - no response received");
    } else {
      // Something happened in setting up the request
      console.error("Error message:", error.message);
    }
    console.error("Request config:", {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
      params: error.config?.params,
    });

    if (error.response?.status === 404) {
      throw new Error("Invalid API endpoint. Please check the API URL.");
    }

    return true; // Still assume it exists for other errors to prevent duplicates
  }
};

const addEntryToRaindropIo = async (entry, headers) => {
  const payload = {
    items: [
      {
        // Wrap in items array
        link: entry.link,
        title: entry.title,
        excerpt: entry.contentSnippet || "",
        tags: ["rss-import"],
      },
    ],
  };

  try {
    console.log("Attempting to add entry with payload:", payload);
    const response = await axios.post(
      "https://api.raindrop.io/rest/v1/raindrops",
      payload, // Remove the item wrapper, use items array instead
      { headers }
    );

    if (response.status === 200) {
      console.log(`Added: ${entry.title}`);
      return true;
    }
  } catch (error) {
    console.error("Error adding entry:");
    if (error.response) {
      console.error("Response error:", {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
      });
    } else if (error.request) {
      console.error("Request error - no response received");
    } else {
      console.error("Error message:", error.message);
    }
    console.error("Request config:", {
      url: error.config?.url,
      method: error.config?.method,
      headers: error.config?.headers,
      data: error.config?.data,
    });
    return false;
  }
};

const main = async () => {
  try {
    const summary = {
      processed: 0,
      added: 0,
      skipped: 0,
      failed: 0,
    };

    // Load configuration
    const { token, feeds } = loadConfiguration();

    // Set up headers
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Process each feed
    for (const feedUrl of feeds) {
      console.log(`\nProcessing feed: ${feedUrl}`);

      try {
        // Parse RSS feed
        const feed = await parser.parseURL(feedUrl);

        if (!feed.items?.length) {
          console.log(`No entries found in feed: ${feedUrl}`);
          continue;
        }

        // Process entries
        for (const entry of feed.items) {
          summary.processed++;
          const exists = await checkIfEntryExists(entry.link, headers);
          if (!exists) {
            const success = await addEntryToRaindropIo(entry, headers);
            if (success) {
              summary.added++;
            } else {
              summary.failed++;
            }
          } else {
            summary.skipped++;
            console.log(`Skipped (already exists): ${entry.title}`);
          }
        }
      } catch (error) {
        console.error(`Error parsing feed ${feedUrl}: ${error.message}`);
        continue;
      }
    }

    // Display summary
    console.log("\n=== Sync Summary ===");
    console.log(`Total entries processed: ${summary.processed}`);
    console.log(`Successfully added: ${summary.added}`);
    console.log(`Skipped (already exist): ${summary.skipped}`);
    console.log(`Failed to add: ${summary.failed}`);
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
  }
};

// Run the script
main();
