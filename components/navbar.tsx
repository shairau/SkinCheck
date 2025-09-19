import Link from "next/link"

export default function Navbar() {
  return (
    <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-gray-800">
            Bare
          </Link>

          <div className="flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:text-gray-800 font-medium transition-colors">
              Home
            </Link>
            <Link href="/analyze" className="text-gray-600 hover:text-gray-800 font-medium transition-colors">
              Analyze
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
