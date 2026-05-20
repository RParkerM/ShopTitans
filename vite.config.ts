import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import * as fs from 'fs'
import * as path from 'path'

// path.resolve normalises separators on Windows so startsWith checks work correctly
const FAN_KIT_ROOT = path.resolve('C:/Development/Fan Kit Assets (Shop Titans)')

function fanKitPlugin(): Plugin {
  return {
    name: 'fan-kit-serve',
    configureServer(server) {
      server.middlewares.use('/fan-kit', (req: any, res: any, next: any) => {
        const filePath = path.join(FAN_KIT_ROOT, decodeURIComponent(req.url ?? '/'))
        // Prevent path traversal
        if (!filePath.startsWith(FAN_KIT_ROOT)) { next(); return; }
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          const ext = path.extname(filePath).toLowerCase()
          const mime = ext === '.png' ? 'image/png' : ext === '.jpg' ? 'image/jpeg' : 'image/webp'
          res.setHeader('Content-Type', mime)
          res.setHeader('Cache-Control', 'public, max-age=86400')
          fs.createReadStream(filePath).pipe(res)
        } else {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), fanKitPlugin()],
})
