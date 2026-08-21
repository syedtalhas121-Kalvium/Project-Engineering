import fs from 'node:fs/promises'
import jwt from 'jsonwebtoken'

const baseUrl = process.env.BASE_URL || 'http://localhost:3000'
const jwtSecret = process.env.JWT_SECRET || 'assignment-local-secret'
const token = jwt.sign({ userId: 'mock-user-1', email: 'mock@example.com' }, jwtSecret, { expiresIn: '1h' })
const calls = [
  ['short-note.txt', 1],
  ['medium-note.txt', 2],
  ['long-note.txt', 3],
  ['short-note.txt', 4],
  ['medium-note.txt', 5]
]

for (const [filename, id] of calls) {
  const noteContent = await fs.readFile(new URL(`./${filename}`, import.meta.url), 'utf8')
  const response = await fetch(`${baseUrl}/notes/${id}/summarize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ noteContent })
  })
  const body = await response.json()
  if (!response.ok || !body.success) throw new Error(`${filename}: HTTP ${response.status} ${JSON.stringify(body)}`)
  console.log(JSON.stringify({ call: id, filename, noteWords: noteContent.trim().split(/\s+/).length, status: response.status, success: body.success }))
}
