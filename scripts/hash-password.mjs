import { pbkdf2Sync, randomBytes } from 'node:crypto';
// Password is supplied only on stdin; never write the password into a command line.
const pieces=[]; for await (const piece of process.stdin) pieces.push(piece);
const password=Buffer.concat(pieces).toString().replace(/\r?\n$/, '');
if (password.length<12 || password.length>200) {console.error('Use a password containing 12–200 characters.'); process.exit(1);}
const salt=randomBytes(16); const hash=pbkdf2Sync(password,salt,100000,32,'sha256');
process.stdout.write(`pbkdf2_sha256$100000$${salt.toString('base64')}$${hash.toString('base64')}\n`);
