import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const ACCOUNT_ID = import.meta.env.VITE_R2_ACCOUNT_ID
const ACCESS_KEY_ID = import.meta.env.VITE_R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = import.meta.env.VITE_R2_SECRET_ACCESS_KEY
const BUCKET_NAME = import.meta.env.VITE_R2_BUCKET_NAME

function getR2Client() {
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
    throw new Error(
      'Cloudflare R2 credentials are not configured. Please set VITE_R2_ACCOUNT_ID, VITE_R2_ACCESS_KEY_ID, VITE_R2_SECRET_ACCESS_KEY, and VITE_R2_BUCKET_NAME in your .env file.',
    )
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  })
}

/**
 * Directly uploads a PDF file to the Cloudflare R2 bucket.
 * The file is saved under books/{bookId}/original.pdf.
 */
export async function uploadBookPdf(bookId, file) {
  const client = getR2Client()
  const key = `books/${bookId}/original.pdf`

  const arrayBuffer = await file.arrayBuffer()
  const uint8 = new Uint8Array(arrayBuffer)

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: uint8,
      ContentType: file.type || 'application/pdf',
    }),
  )

  return { r2Key: key }
}

/**
 * Directly retrieves a PDF from Cloudflare R2.
 * Returns a Blob URL for the reader, or /sample-book.pdf if reading the sample book.
 */
export async function getBookDownloadUrl(r2Key, isSample = false) {
  if (isSample || r2Key === 'sample-book.pdf') {
    return '/sample-book.pdf'
  }

  const client = getR2Client()

  const response = await client.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: r2Key,
    }),
  )

  const byteArray = await response.Body.transformToByteArray()
  const blob = new Blob([byteArray], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

/**
 * Directly deletes a PDF from the Cloudflare R2 bucket.
 */
export async function deleteBookFromR2(r2Key) {
  if (!r2Key || r2Key === 'sample-book.pdf') return

  try {
    const client = getR2Client()
    await client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key,
      }),
    )
  } catch (err) {
    console.warn('Failed to delete object from R2:', err)
  }
}
