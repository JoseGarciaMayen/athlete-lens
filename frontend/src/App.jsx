import Upload from "./pages/Upload";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-gray-900">Athlete Lens</h1>
        </div>
      </header>

      <main>
        <Upload />
      </main>
    </div>
  );
}

export default App;