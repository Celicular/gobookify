import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Trash2, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { getAllBooks, saveBook, deleteBook } from '../services/db'
import { uploadBookPdf, deleteBookFromR2 } from '../services/storage'
import { loadPdfDocument, generateCoverThumbnail } from '../services/pdf'

const SAMPLE_BOOK_ID = 'sample-great-gatsby'

export default function HomePage() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [books, setBooks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [bookToDelete, setBookToDelete] = useState(null)

  // 1. Load books and ensure sample book is available on mount
  useEffect(() => {
    let isMounted = true

    async function initLibrary() {
      try {
        const existingBooks = await getAllBooks()
        if (!isMounted) return

        let currentList = existingBooks
        const hasSample = currentList.some((b) => b.id === SAMPLE_BOOK_ID)

        const defaultSample = {
          id: SAMPLE_BOOK_ID,
          title: 'The Great Gatsby',
          pageCount: 4,
          currentPosition: 1,
          coverUrl: null,
          r2Key: 'sample-book.pdf',
          isSample: true,
        }

        if (!hasSample) {
          await saveBook(defaultSample)
          currentList = [defaultSample, ...currentList]
        }

        if (isMounted) {
          setBooks(currentList)
        }

        // Generate cover thumbnail in background if missing
        const sampleInList = currentList.find((b) => b.id === SAMPLE_BOOK_ID)
        if (sampleInList && !sampleInList.coverUrl) {
          try {
            const sampleDoc = await loadPdfDocument('/sample-book.pdf')
            const cover = await generateCoverThumbnail(sampleDoc, 400)
            if (cover && isMounted) {
              const updated = {
                ...sampleInList,
                coverUrl: cover,
                pageCount: sampleDoc.numPages || 4,
              }
              await saveBook(updated)
              setBooks((prev) => prev.map((b) => (b.id === SAMPLE_BOOK_ID ? updated : b)))
            }
          } catch (err) {
            console.warn('Could not generate sample cover thumbnail:', err)
          }
        }
      } catch (err) {
        console.error('Failed to load library:', err)
        if (isMounted) setErrorMessage('Could not load your books from local storage.')
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    initLibrary()
    return () => {
      isMounted = false
    }
  }, [])

  // 2. Handle File Upload (R2 Presigned Upload Flow)
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so same file can be chosen again if needed
    e.target.value = ''

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage("This file isn't a valid PDF. Please select a PDF document.")
      return
    }

    try {
      setIsUploading(true)
      setErrorMessage(null)

      const bookId = `book_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
      const title = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')

      // Parse PDF locally to get page count and render cover thumbnail
      const arrayBuffer = await file.arrayBuffer()
      const pdfDoc = await loadPdfDocument(arrayBuffer)
      const pageCount = pdfDoc.numPages
      const coverUrl = await generateCoverThumbnail(pdfDoc, 400)

      // Upload PDF to Cloudflare R2 via presigned PUT
      const { r2Key } = await uploadBookPdf(bookId, file)

      // Save metadata to IndexedDB
      const newBook = {
        id: bookId,
        title,
        pageCount,
        currentPosition: 1,
        coverUrl,
        r2Key,
        isSample: false,
      }

      await saveBook(newBook)
      navigate(`/read/${bookId}`)
    } catch (err) {
      console.error('Upload error:', err)
      setErrorMessage(
        err.message ||
          "Couldn't upload this book. Please check your Cloudflare R2 credentials in .env and try again.",
      )
    } finally {
      setIsUploading(false)
    }
  }

  // 3. Handle Book Deletion
  const confirmDelete = async () => {
    if (!bookToDelete) return
    try {
      await deleteBookFromR2(bookToDelete.r2Key)
      await deleteBook(bookToDelete.id)
      setBooks((prev) => prev.filter((b) => b.id !== bookToDelete.id))
      setBookToDelete(null)
    } catch (err) {
      console.error('Failed to delete book:', err)
      setErrorMessage('Could not delete book. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-12 sm:px-8 lg:px-16">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="mx-auto max-w-5xl">
        {/* Header Section (Editorial Modernism) */}
        <header className="mb-12 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end border-b border-black/8 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-surface-dark" />
              <span className="font-sans text-xs font-semibold uppercase tracking-widest text-text-muted">
                Digital Library
              </span>
            </div>
            <h1 className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary uppercase">
              Bookify
            </h1>
            <p className="font-serif italic text-xl sm:text-2xl text-text-secondary mt-1">
              Open your book. Turn the page. Read.
            </p>
          </div>

          {/* Primary Action: Open PDF */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2.5 rounded-pill bg-surface-dark px-6 py-3 text-xs sm:text-sm font-sans font-semibold text-text-inverse shadow-soft hover:bg-black transition-all hover:scale-102 active:scale-98 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading to R2...</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                <span>Open PDF</span>
              </>
            )}
          </button>
        </header>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-8 flex items-center justify-between rounded-xl bg-red-50 p-4 border border-red-200 text-red-800 text-xs sm:text-sm font-sans">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold text-red-600 hover:text-red-900 ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading ? (
          <div className="flex min-h-[300px] flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-text-muted mb-2" />
            <p className="font-sans text-xs text-text-muted uppercase tracking-wider">Loading your library...</p>
          </div>
        ) : (
          <div>
            {/* Book Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 sm:gap-8">
              {books.map((book) => {
                const progressPct = Math.round(((book.currentPosition || 1) / (book.pageCount || 1)) * 100)
                return (
                  <div key={book.id} className="group relative flex flex-col">
                    {/* Book Card Cover */}
                    <Link
                      to={`/read/${book.id}`}
                      className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-surface-cream shadow-soft border border-black/8 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-float flex items-center justify-center"
                    >
                      {book.coverUrl ? (
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-4 text-center">
                          <BookOpen className="h-8 w-8 text-text-muted mb-2 opacity-50" />
                          <span className="font-sans text-xs font-semibold text-text-secondary line-clamp-2">
                            {book.title}
                          </span>
                        </div>
                      )}

                      {/* Sample Badge */}
                      {book.isSample && (
                        <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-pill bg-honey-surface border border-honey-border px-2 py-0.5 text-[10px] font-mono font-semibold text-honey-text shadow-xs">
                          <Sparkles size={10} />
                          Sample
                        </span>
                      )}

                      {/* Delete Quick Button (Hover on Card) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setBookToDelete(book)
                        }}
                        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-full bg-surface-white/90 text-text-muted hover:text-red-600 shadow-soft"
                        title="Delete book"
                      >
                        <Trash2 size={13} />
                      </button>
                    </Link>

                    {/* Book Info */}
                    <div className="mt-3 flex flex-col">
                      <Link
                        to={`/read/${book.id}`}
                        className="font-sans text-sm font-semibold text-text-primary hover:underline line-clamp-1"
                      >
                        {book.title}
                      </Link>

                      {/* Page Counter & Progress */}
                      <div className="mt-1 flex items-center justify-between font-mono text-[11px] text-text-subtle">
                        <span>
                          {book.currentPosition || 1} / {book.pageCount || 1}
                        </span>
                        <span>{progressPct}%</span>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-surface-subtle">
                        <div
                          className="h-full bg-surface-dark transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Add New Book Empty Slot */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group flex aspect-[3/4] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-black/10 bg-surface-cream/40 p-4 transition-all hover:border-black/30 hover:bg-surface-cream"
              >
                <div className="rounded-full bg-surface-white p-3 shadow-soft group-hover:scale-110 transition-transform mb-2">
                  <Plus className="h-5 w-5 text-text-secondary" />
                </div>
                <span className="font-sans text-xs font-semibold text-text-primary">Add Book</span>
                <span className="font-sans text-[11px] text-text-subtle mt-0.5">PDF format</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {bookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-2xl bg-surface-white p-6 shadow-float border border-black/10">
            <h3 className="font-sans text-base font-bold text-text-primary mb-1">Delete Book?</h3>
            <p className="font-sans text-xs text-text-muted leading-relaxed mb-6">
              Are you sure you want to remove &ldquo;{bookToDelete.title}&rdquo;? This will permanently delete your
              reading progress, highlights, and doodles.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setBookToDelete(null)}
                className="rounded-pill px-4 py-2 text-xs font-sans font-semibold text-text-secondary hover:bg-surface-cream transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-pill bg-red-600 px-4 py-2 text-xs font-sans font-semibold text-white hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
