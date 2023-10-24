require("dotenv").config();
import { NotionAdapter } from "../adapters";
import { GroupedClipping } from "../interfaces";
import { CreatePageParams, Emoji, BlockType } from "../interfaces";
import {
  makeHighlightsBlocks,
  updateSync,
  getUnsyncedHighlights,
  makeBlocks,
} from "../utils";

 
async function createNewbookHighlights(title: string, author: string, highlights: string[],  notionInstance: NotionAdapter) {
  const createPageParams: CreatePageParams = {
    parentDatabaseId: process.env.BOOK_DB_ID as string,
    properties: {
      title: title,
      author: author,
      bookName: title,
    },
    children: makeHighlightsBlocks(highlights, BlockType.bulleted_list_item),
    icon: Emoji["🔖"],
  }
  await notionInstance.createPage(createPageParams);
}

export class Notion {
  private notion;

  constructor() {
    this.notion = new NotionAdapter();
  }




  /* Method to get Notion block id of the Notion page given the book name */
  getIdFromBookName = async (bookName: string) => {
    const response = await this.notion.queryDatabase({
      database_id: process.env.BOOK_DB_ID as string,
      filter: {
        or: [
          {
            property: "Kindle name",
            text: {
              equals: bookName,
            },
          },
        ],
      },
    });
    const [book] = response.results;
    if (book) {
      return book.id;
    } else {
      return null;
    }
  };

  /* Method to sync highlights to notion */
  syncHighlights = async (books: GroupedClipping[]) => {
    try {
      // get unsynced highlights from each book
      const unsyncedBooks = getUnsyncedHighlights(books);
      // if unsynced books are present
      if (unsyncedBooks.length > 0) {
        console.log("\n🚀 Syncing highlights to Notion");
        for (const book of unsyncedBooks) {
          console.log(`\n🔁 Syncing book: ${book.title}`);
          const bookId = await this.getIdFromBookName(book.title);
          // if the book is already present in Notion
          if (bookId) {
            console.log(`📚 Book already present, appending highlights`);
            // append unsynced highlights at the end of the page
            
            if(book.highlights.length <= 100) {
              await this.notion.appendBlockChildren(
                bookId,
                makeBlocks(book.highlights, BlockType.bulleted_list_item)
              );
            } else {
              // handle pagination if there are more than 100 highlights
              let highlightsTracker = 0;
              while(highlightsTracker < book.highlights.length) {
                await this.notion.appendBlockChildren(
                  bookId,
                  makeBlocks(book.highlights.slice(highlightsTracker, highlightsTracker+99), BlockType.bulleted_list_item)
                );
                highlightsTracker+=99;
              }
            }
            updateSync(book);
          } else {
            console.log(`📚 Book not present, create notion page to sync`);
          }
            
          // after each book is successfully synced, update the sync metadata (cache)
          // updateSync(book);
        }
        console.log("\n✅ Successfully synced highlights to Notion");
      } else {
        console.log("🟢 Every book is already synced!");
      }
    } catch (error: unknown) {
      console.error("❌ Failed to sync highlights", error);
      throw error;
    } finally {
      console.log("--------------------------------------");
    }
  };
}
