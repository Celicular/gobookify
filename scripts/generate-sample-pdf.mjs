import fs from 'node:fs'
import path from 'node:path'

// Generate a valid 4-page PDF with selectable text
function generatePdf() {
  const pages = [
    {
      title: "The Great Gatsby",
      subtitle: "F. Scott Fitzgerald",
      lines: [
        "In my younger and more vulnerable years my father gave me some advice",
        "that I've been turning over in my mind ever since.",
        "",
        "\"Whenever you feel like criticizing anyone,\" he told me,",
        "\"just remember that all the people in this world haven't had",
        "the advantages that you've had.\"",
        "",
        "He didn't say any more, but we've always been unusually",
        "communicative in a reserved way, and I understood that he meant",
        "a great deal more than that. In consequence, I'm inclined to",
        "reserve all judgments, a habit that has opened up many curious",
        "natures to me and also made me the victim of not a few veteran bores."
      ]
    },
    {
      title: "Chapter I - Continued",
      subtitle: "The East and West Egg",
      lines: [
        "My family have been prominent, well-to-do people in this Middle Western",
        "city for three generations. The Carraways are something of a clan,",
        "and we have a tradition that we're descended from the Dukes of Buccleuch,",
        "but the actual founder of my line was my grandfather's brother.",
        "",
        "I graduated from New Haven in 1915, just a quarter of a century after",
        "my father, and a little later I participated in that delayed Teutonic",
        "migration known as the Great War. I enjoyed the counter-raid so thoroughly",
        "that I came back restless. Instead of being the warm center of the world,",
        "the Middle West now seemed like the ragged edge of the universe."
      ]
    },
    {
      title: "Chapter II - The Valley of Ashes",
      subtitle: "Between West Egg and New York",
      lines: [
        "About half way between West Egg and New York the motor road hastily",
        "joins the railroad and runs beside it for a quarter of a mile, so as",
        "to shrink away from a certain desolate area of land.",
        "",
        "This is a valley of ashes - a fantastic farm where ashes grow like wheat",
        "into ridges and hills and grotesque gardens; where ashes take the forms",
        "of houses and chimneys and rising smoke and, finally, with a transcendent",
        "effort, of ash-gray men who move dimly and already crumbling through",
        "the powdery air. Occasionally a line of gray cars crawls along an",
        "unseen track, gives out a ghastly creak, and comes to rest."
      ]
    },
    {
      title: "Chapter III - Summer Nights",
      subtitle: "Gatsby's Parties",
      lines: [
        "There was music from my neighbor's house through the summer nights.",
        "In his blue gardens men and girls came and went like moths among the",
        "whisperings and the champagne and the stars. At high tide in the",
        "afternoon I watched his guests diving from the tower of his raft, or",
        "taking the sun on the hot sand of his beach while his two motor-boats",
        "slit the waters of the Sound, drawing aquaplanes over cataracts of foam.",
        "",
        "On week-ends his Rolls-Royce became an omnibus, bearing parties to",
        "and from the city between nine in the morning and long past midnight."
      ]
    }
  ]

  const objects = []
  let objIndex = 1

  function escapePdfString(str) {
    return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  }

  // Obj 1: Catalog
  // Obj 2: Pages
  // Obj 3: Font
  // For each page: Page Obj, Content Obj
  const pageObjIds = []
  const contentObjIds = []

  let nextId = 4
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(nextId++)
    contentObjIds.push(nextId++)
  }

  const catalogId = 1
  const pagesId = 2
  const fontId = 3

  // Build stream for each page
  const contentStreams = pages.map((p, idx) => {
    let stream = "BT\n"
    // Title
    stream += `/F1 24 Tf\n50 720 Td\n(${escapePdfString(p.title)}) Tj\n`
    // Subtitle
    stream += `0 -28 Td\n/F1 12 Tf\n(${escapePdfString(p.subtitle)}) Tj\n`
    // Separator line
    stream += `0 -30 Td\n/F1 11 Tf\n`
    // Body lines
    let currentY = 0
    p.lines.forEach((line) => {
      if (line === "") {
        stream += `0 -18 Td\n`
      } else {
        stream += `0 -16 Td\n(${escapePdfString(line)}) Tj\n`
      }
    })
    // Page footer
    stream += `0 -80 Td\n/F1 10 Tf\n(Page ${idx + 1} of ${pages.length}) Tj\n`
    stream += "ET\n"
    return stream
  })

  // Catalog
  objects.push({
    id: catalogId,
    content: `<< /Type /Catalog /Pages ${pagesId} 0 R >>`
  })

  // Pages
  const kids = pageObjIds.map(id => `${id} 0 R`).join(' ')
  objects.push({
    id: pagesId,
    content: `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`
  })

  // Font
  objects.push({
    id: fontId,
    content: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`
  })

  // Page objects & Content objects
  pages.forEach((p, idx) => {
    const pageId = pageObjIds[idx]
    const contentId = contentObjIds[idx]
    const stream = contentStreams[idx]

    objects.push({
      id: pageId,
      content: `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595.28 841.89] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    })

    objects.push({
      id: contentId,
      content: `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream`
    })
  })

  // Sort by id
  objects.sort((a, b) => a.id - b.id)

  let pdf = "%PDF-1.4\n"
  const offsets = []

  objects.forEach(obj => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'))
    pdf += `${obj.id} 0 obj\n${obj.content}\nendobj\n`
  })

  const xrefOffset = Buffer.byteLength(pdf, 'utf8')
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.forEach(offset => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`

  const outDir = path.resolve('public')
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }
  const outPath = path.join(outDir, 'sample-book.pdf')
  fs.writeFileSync(outPath, pdf, 'utf8')
  console.log(`Generated sample book at: ${outPath} (${Buffer.byteLength(pdf, 'utf8')} bytes)`)
}

generatePdf()
