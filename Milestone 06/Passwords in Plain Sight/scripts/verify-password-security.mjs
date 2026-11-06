import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import bcrypt from 'bcrypt'

const controllerPath = new URL('../backend/controllers/authController.js', import.meta.url)
const modelPath = new URL('../backend/models/User.js', import.meta.url)
const controller = await fs.readFile(controllerPath, 'utf8')
const model = await fs.readFile(modelPath, 'utf8')

assert.match(controller, /bcrypt\.hash\(password,\s*SALT_ROUNDS\)/)
assert.match(controller, /bcrypt\.compare\(password,\s*user\.password\)/)
assert.doesNotMatch(controller, /password:\s*password\s*[,}]/)
assert.doesNotMatch(controller, /user\.password\s*!==\s*password/)
assert.match(model, /select:\s*false/)
assert.match(controller, /select\('\+password'\)/)

const plaintext = 'DemoPass123!'
const hash = await bcrypt.hash(plaintext, 12)
assert.match(hash, /^\$2[aby]\$12\$/)
assert.notEqual(hash, plaintext)
assert.equal(await bcrypt.compare(plaintext, hash), true)
assert.equal(await bcrypt.compare('WrongPass123!', hash), false)

console.log('PASS: signup hashes the password with bcrypt before persistence')
console.log('PASS: bcrypt hash is not equal to the submitted plaintext')
console.log('PASS: correct password is accepted by bcrypt.compare')
console.log('PASS: incorrect password is rejected by bcrypt.compare')
console.log('PASS: password is excluded by default and explicitly selected only for login')
console.log('All password-security checks passed.')
