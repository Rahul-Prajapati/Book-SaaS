import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50 shadow-sm">
        <div className="container max-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">B</span>
              </div>

              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                BookStore
              </span>
            </Link>

            <div className="flex items-center space-x-6">
              <Link
                href="/login"
                className="text-gray-700 hover:text-indigo-600 font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="container mx-auto px-4 text-center max-w-5xl">
          <div className="inline-block mb-6 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold shadow-sm">
            📚 Over 1000+ Book Summaries Available
          </div>
          <h1 className="text-6xl md:text-7xl font-extrabold text-gray-900 mb-8 leading-tight">
            Learn from the best books in
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              just 15 minutes
            </span>
          </h1>
          <p className="text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
            Get key insights from bestselling books. Read or listen anytime,
            anywhere.
          </p>
          <div className="flex gap-4 justify-center mb-16">
            <Link
              href="/register"
              className="px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg rounded-xl font-bold shadow-2xl hover:shadow-indigo-500/50 transform hover:scale-105 transition-all"
            >
              Start Free Today
            </Link>
            <Link
              href="/books"
              className="px-10 py-5 bg-white border-2 border-gray-300 text-gray-900 text-lg rounded-xl font-bold hover:border-indigo-400 hover:bg-gray-50 transition-all"
            >
              Browse Library
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-12 max-w-3xl mx-auto pt-12 border-t-2 border-gray-200">
            <div>
              <div className="text-4xl font-black text-indigo-600">1000+</div>
              <div className="text-gray-600 font-medium">Summaries</div>
            </div>
            <div>
              <div className="text-4xl font-black text-purple-600">15min</div>
              <div className="text-gray-600 font-medium">Per Book</div>
            </div>
            <div>
              <div className="text-4xl font-black text-pink-600">20+</div>
              <div className="text-gray-600 font-medium">Categories</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold text-gray-900 mb-6">
              Why Choose BookStore?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to accelerate your learning journey
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-10 max-w-6xl mx-auto">
            {[
              {
                icon: "📖",
                title: "Expert Summaries",
                desc: "Professional summaries capturing key insights from each book",
                color: "indigo",
              },
              {
                icon: "🎧",
                title: "Audio Narration",
                desc: "Listen on-the-go with high-quality AI-powered audio",
                color: "purple",
              },
              {
                icon: "⚡",
                title: "Save Hours",
                desc: "Learn in 15 minutes what takes hours to read",
                color: "pink",
              },
              {
                icon: "💡",
                title: "Key Insights",
                desc: "Action able takeaways highlighted for quick reference",
                color: "indigo",
              },
              {
                icon: "📱",
                title: "Any Device",
                desc: "Seamless experience across web, mobile, and tablet",
                color: "purple",
              },
              {
                icon: "⭐",
                title: "Best Selection",
                desc: "Curated collection of top-rated bestsellers",
                color: "pink",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`p-8 rounded-2xl border-2 border-gray-100 hover:border-${feature.color}-200 hover:shadow-xl transition-all duration-300`}
              >
                <div
                  className={`w-16 h-16 bg-${feature.color}-100 rounded-2xl flex items-center justify-center mb-6 text-3xl`}
                >
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-lg">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-8">
            Start Learning Today
          </h2>
          <p className="text-2xl text-indigo-100 mb-12 max-w-2xl mx-auto">
            Join thousands growing their knowledge daily
          </p>
          <Link
            href="/register"
            className="inline-block px-12 py-6 bg-white text-indigo-600 text-xl rounded-xl font-bold shadow-2xl hover:shadow-white/30 transform hover:scale-105 transition-all"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <span className="text-2xl font-bold text-white">BookStore</span>
          </div>
          <p className="mb-8 text-lg">
            Learn from the world's best books in just 15 minutes.
          </p>
          <p className="text-sm">&copy; 2024 BookStore. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
