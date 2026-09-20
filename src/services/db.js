import { openDB } from 'idb'

const DB_NAME = 'bookify_db'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Books store
      if (!db.objectStoreNames.contains('books')) {
        const bookStore = db.createObjectStore('books', { keyPath: 'id' })
        bookStore.createIndex('by-updated', 'updatedAt')
      }

      // Highlights store
      if (!db.objectStoreNames.contains('highlights')) {
        const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' })
        highlightStore.createIndex('by-book', 'bookId')
        highlightStore.createIndex('by-book-page', ['bookId', 'pageNumber'])
      }

      // Drawings store
      if (!db.objectStoreNames.contains('drawings')) {
        const drawingStore = db.createObjectStore('drawings', { keyPath: 'id' })
        drawingStore.createIndex('by-book', 'bookId')
        drawingStore.createIndex('by-book-page', ['bookId', 'pageNumber'])
      }

      // Bookmarks store
      if (!db.objectStoreNames.contains('bookmarks')) {
        const bookmarkStore = db.createObjectStore('bookmarks', { keyPath: 'id' })
        bookmarkStore.createIndex('by-book', 'bookId')
        bookmarkStore.createIndex('by-book-page', ['bookId', 'pageNumber'])
      }
    },
  })
}

// ------------------- Book Operations -------------------

export async function getAllBooks() {
  const db = await getDB()
  const books = await db.getAllFromIndex('books', 'by-updated')
  return books.reverse() // Most recent first
}

export async function getBook(id) {
  const db = await getDB()
  return db.get('books', id)
}

export async function saveBook(book) {
  const db = await getDB()
  const existing = await db.get('books', book.id)
  const now = new Date().toISOString()
  const updated = {
    ...existing,
    ...book,
    updatedAt: now,
    createdAt: existing?.createdAt || now,
  }
  await db.put('books', updated)
  return updated
}

export async function updateReadingProgress(bookId, currentPage) {
  const db = await getDB()
  const book = await db.get('books', bookId)
  if (!book) return
  book.currentPosition = currentPage
  book.updatedAt = new Date().toISOString()
  await db.put('books', book)
}

export async function deleteBook(id) {
  const db = await getDB()
  const tx = db.transaction(['books', 'highlights', 'drawings', 'bookmarks'], 'readwrite')
  
  await tx.objectStore('books').delete(id)
  
  // Delete associated annotations
  const hlIndex = tx.objectStore('highlights').index('by-book')
  let hlCursor = await hlIndex.openCursor(id)
  while (hlCursor) {
    await hlCursor.delete()
    hlCursor = await hlCursor.continue()
  }

  const dwIndex = tx.objectStore('drawings').index('by-book')
  let dwCursor = await dwIndex.openCursor(id)
  while (dwCursor) {
    await dwCursor.delete()
    dwCursor = await dwCursor.continue()
  }

  const bmIndex = tx.objectStore('bookmarks').index('by-book')
  let bmCursor = await bmIndex.openCursor(id)
  while (bmCursor) {
    await bmCursor.delete()
    bmCursor = await bmCursor.continue()
  }

  await tx.done
}

// ------------------- Highlights Operations -------------------

export async function getHighlightsForPage(bookId, pageNumber) {
  const db = await getDB()
  return db.getAllFromIndex('highlights', 'by-book-page', [bookId, pageNumber])
}

export async function saveHighlight(highlight) {
  const db = await getDB()
  const item = {
    id: highlight.id || `hl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    ...highlight,
    createdAt: highlight.createdAt || new Date().toISOString(),
  }
  await db.put('highlights', item)
  return item
}

export async function deleteHighlight(id) {
  const db = await getDB()
  await db.delete('highlights', id)
}

// ------------------- Drawing Operations -------------------

export async function getDrawingForPage(bookId, pageNumber) {
  const db = await getDB()
  const drawings = await db.getAllFromIndex('drawings', 'by-book-page', [bookId, pageNumber])
  return drawings[0] || null
}

export async function saveDrawing(drawing) {
  const db = await getDB()
  const item = {
    id: drawing.id || `dw_${drawing.bookId}_${drawing.pageNumber}`,
    ...drawing,
    updatedAt: new Date().toISOString(),
  }
  await db.put('drawings', item)
  return item
}

export async function deleteDrawing(id) {
  const db = await getDB()
  await db.delete('drawings', id)
}

// ------------------- Bookmark Operations -------------------

export async function getBookmarksForBook(bookId) {
  const db = await getDB()
  return db.getAllFromIndex('bookmarks', 'by-book', bookId)
}

export async function isPageBookmarked(bookId, pageNumber) {
  const db = await getDB()
  const marks = await db.getAllFromIndex('bookmarks', 'by-book-page', [bookId, pageNumber])
  return marks.length > 0
}

export async function toggleBookmark(bookId, pageNumber) {
  const db = await getDB()
  const marks = await db.getAllFromIndex('bookmarks', 'by-book-page', [bookId, pageNumber])
  if (marks.length > 0) {
    await db.delete('bookmarks', marks[0].id)
    return false
  } else {
    const newMark = {
      id: `bm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      bookId,
      pageNumber,
      createdAt: new Date().toISOString(),
    }
    await db.put('bookmarks', newMark)
    return true
  }
}
