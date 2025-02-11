import React, { useState } from "react";
import { Mistral } from "@mistralai/mistralai";
import {
  Container,
  Card,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
} from "@mui/material";

const client = new Mistral({ apiKey: process.env.REACT_APP_MISTRAL_API_KEY });

function App() {
  const [docUrl, setDocUrl] = useState("");
  const [htmlContent, setHtmlContent] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
      await analyzeDocument(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeDocument = async (content) => {
    try {
      setLoading(true);
      setError(null);

      const chatResponse = await client.chat.complete({
        model: "pixtral-12b-2409",
        messages: [
          {
            role: "user",
            content: `Aşağıdaki dökümanın türünü belirle ve detaylı bir şekilde her bir başlık için eksiklerini belirle ve analiz et. Ayrıca içeriği tasarımsal açıdan da değerlendir. İçerik budur:\n\n${content}`,
          },
        ],
      });

      const aiAnalysis = chatResponse?.choices?.[0]?.message?.content;
      if (aiAnalysis) {
        setAnalysis(aiAnalysis);
      } else {
        setError("AI tarafından analiz sonuçları alınamadı.");
      }
    } catch (err) {
      setError("Analiz sırasında bir hata oluştu: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  const parseAnalysis = (analysisText) => {
    // '###' ile başlıkları ve içerikleri ayırma
    const sections = analysisText.split("###").map((section) => section.trim());
    return sections.filter((section) => section !== ""); // Boş bölümleri temizle
  };
  return (
    <Container maxWidth="md" style={{ marginTop: "2rem" }}>
      <Card style={{ padding: "2rem", textAlign: "center" }}>
        <Typography variant="h4" gutterBottom>
          Döküman Analizi
        </Typography>
        <TextField
          fullWidth
          label="Google Docs URL'sini girin"
          variant="outlined"
          value={docUrl}
          onChange={(e) => setDocUrl(e.target.value)}
          margin="normal"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={() => fetchGoogleDocsHTML(docUrl)}
          disabled={loading || !docUrl}
        >
          {loading ? (
            <>
              <CircularProgress size={24} style={{ marginRight: "8px" }} />
              Analiz Ediliyor...
            </>
          ) : (
            "Dökümanı Analiz Et"
          )}
        </Button>


        {error && (
          <Alert severity="error" style={{ marginTop: "1rem" }}>
            {error}
          </Alert>
        )}

        {htmlContent && analysis && (
          <div style={{ marginTop: "2rem", textAlign: "left" }}>
            {/* Döküman İçeriği */}
            <Typography variant="h5" color="primary" gutterBottom>
              Döküman İçeriği
            </Typography>
            <Card style={{ padding: "1rem" }}>
              <div
                className="max-w-full overflow-x-auto break-words whitespace-pre-wrap text-base leading-relaxed"
                dangerouslySetInnerHTML={{ __html: htmlContent }}
              />

            </Card>

            {/* Analiz Sonuçları */}
            <Typography variant="h5" color="primary" style={{ marginTop: "1.5rem" }} gutterBottom>
              Analiz Sonuçları
            </Typography>
            <Card style={{ padding: "1rem", backgroundColor: "#e3f2fd" }}>
              <Typography variant="body1" style={{ whiteSpace: "pre-line" }}>
             {/* Başlıkları ayırarak render etme */}
             {parseAnalysis(analysis).map((section, index) => {
                const [title, ...content] = section.split("\n");
                return (
                  <div key={index}>
                    <Typography variant="h6" style={{ marginTop: "1rem" }}>
                      {title}
                    </Typography>
                    <Typography variant="body1">{content.join("\n")}</Typography>
                  </div>
                );
              })}
              </Typography>
            </Card>
          </div>
        )}
      </Card>
    </Container>
  );
}

export default App;
