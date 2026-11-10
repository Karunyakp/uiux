const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Answers may contain only <mark data-c>…</mark> highlights; everything else is escaped. */
export function sanitizeAnswerHtml(s) {
  return esc(s)
    .replace(/&lt;mark data-c&gt;/g, '<mark data-c>')
    .replace(/&lt;\/mark&gt;/g, '</mark>')
}

export const stripTags = s => String(s).replace(/<[^>]*>/g, '')

const STOP = new Set(('the and for are but not you can will with this that from have has was were what when where which who how why does did '
  + 'any all about into than then them they their there our your its may might should would could been being one two get got').split(' '))

export const tokens = s => [...new Set(
  String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP.has(w))
)]
