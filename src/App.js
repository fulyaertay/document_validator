import React, { useState, useRef, useEffect } from "react";
import { Mistral } from "@mistralai/mistralai";
import html2canvas from "html2canvas";

const client = new Mistral({ apiKey: process.env.REACT_APP_MISTRAL_API_KEY });

function App() {
  const [docUrl, setDocUrl] = useState("");
  const [htmlContent, setHtmlContent] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const analysisRef = useRef(null);

  useEffect(() => {
    if (htmlContent !== "") analyzeDocument(); // İçeriği aldıktan sonra analiz başlat
  }, [htmlContent]);

  // HTML etiketlerini temizleyip düz metni almak için fonksiyon
  const cleanHtmlContent = (htmlContent) => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    return doc.body.textContent || "";
  };

  // Google Docs içeriğini HTML formatında al
  const fetchGoogleDocsHTML = async (url) => {
    try {
      setLoading(true);
      setError(null);

      const docId = url.match(/[-\w]{25,}/);
      if (!docId) throw new Error("Geçersiz Google Docs URL'si");

      const response = await fetch(
        `https://docs.google.com/feeds/download/documents/export/Export?id=${docId}&exportFormat=html`
      );
      if (!response.ok) throw new Error("Google Docs içeriği alınamadı");

      const text = await response.text();
      setHtmlContent(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google Docs URL’sinden içeriği çek
  const handleFetchDoc = async () => {
    if (!docUrl) {
      setError("Lütfen geçerli bir Google Docs URL'si girin.");
      return;
    }

    await fetchGoogleDocsHTML(docUrl);
  };

  // Mistral AI ile analiz yap
  const analyzeDocument = async () => {
    if (!htmlContent) {
      setError("Lütfen önce bir döküman yükleyin.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // HTML etiketlerini temizle
      const cleanContent = cleanHtmlContent(htmlContent);

      const chatResponse = await client.chat.complete({
        model: "pixtral-12b-2409",
        messages: [
          {
            role: "user",
            content: `Aşağıdaki dökümanın türünü belirle ve eksiklerini analiz et. İçerik aşağıdadır:\n\n${cleanContent}`,
          },
        ],
      });

      console.log("Mistral API Yanıtı:", chatResponse); // Yanıtı kontrol et

      // API yanıtının geçerli olduğundan emin ol
      const aiAnalysis = chatResponse?.choices?.[0]?.message?.content;
      if (aiAnalysis) {
        setAnalysis(aiAnalysis);
        alert("Analiz Sonuçları tamamlandı!")
      } else {
        setError("AI tarafından analiz sonuçları alınamadı.");
      }
    } catch (err) {
      setError("Analiz sırasında bir hata oluştu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // HTML içeriğini formatla (başlıkları düzenle)
  const formatHtmlContent = (htmlContent) => {
    let formattedContent = htmlContent;
    
    // "##" ve "###" sembollerini kaldır
    formattedContent = formattedContent.replace(/##/g, '').replace(/###/g, '');
    
    formattedContent = formattedContent.replace(/<h1>/g, '<h1 class="text-2xl font-semibold text-indigo-600">')
                                       .replace(/<h2>/g, '<h2 class="text-xl font-semibold text-indigo-600">')
                                       .replace(/<h3>/g, '<h3 class="text-lg font-semibold text-indigo-600">')
                                       .replace(/<p>/g, '<p class="text-gray-700">');
    return formattedContent;
  };

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <div className="flex justify-center">
  <h2 className="text-3xl font-bold  mb-4">
    Döküman Analizi
  </h2>
</div>
       
        <p className="text-gray-600 text-center mb-6">
          Google Docs URL'sini girin ve analiz alın.
        </p>

        <div className="flex gap-4">
          <input
            type="url"
            value={docUrl}
            onChange={(e) => setDocUrl(e.target.value)}
            placeholder="Google Docs URL'sini girin"
            className="flex-1 min-w-0 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-4"
            required
          />
          <button
            onClick={handleFetchDoc}
            disabled={loading}
            className="px-6 py-3 rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Analiz Ediliyor..." : "Dökümanı Al"}
          </button>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 p-4 rounded-md text-red-700 text-center">
            {error}
          </div>
        )}

        {htmlContent && (
          <div className="mt-8">
            <div className="mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
               <div className="px-6 py-4 bg-gradient-to-r  text-white text-lg from-indigo-600 to-blue-500">
             Döküman İçeriği
            </div></div>
            <div
              ref={analysisRef}
              className="p-4 bg-white rounded-lg shadow"
              dangerouslySetInnerHTML={{ __html: formatHtmlContent(htmlContent) }}
            />
          </div>
        )}

        {analysis && (
          <div className="mt-8 bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r  text-white text-lg from-indigo-600 to-blue-500">
              Analiz Sonuçları
            </div>
            <div className="border-t border-gray-200 px-6 py-6 prose text-blue max-w-none space-y-4">
              {analysis.split("\n").map((line, i) => {
                if (line.startsWith("#")) {
                  return <h4 key={i} className="text-2xl font-semibold text-blue">{line.replace("#", "")}</h4>;
                }
                if (line.startsWith("##")) {
                  return <h4 key={i} className="text-xl font-semibold text-blue">{line.replace("##", "")}</h4>;
                }
                if (line.startsWith("###")) {
                  return <h4 key={i} className="text-lg font-semibold text-blue">{line.replace("###", "")}</h4>;
                }
                return <p key={i} className="text-blue-700">{line}</p>;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
