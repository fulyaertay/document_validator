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
  const [question, setQuestion] = useState(""); // Kullanıcının sorusu
  const [answer, setAnswer] = useState(null); // AI cevabı
  const [questionLoading, setQuestionLoading] = useState(false); // Soru işlemi için loading state

  // Google Docs içeriğini çekme fonksiyonu
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

  // AI ile doküman analizi yapma fonksiyonu
  const analyzeDocument = async (content) => {
    try {
      setLoading(true);
      setError(null);

      const chatResponse = await client.chat.complete({
        model: "pixtral-12b-2409",
        messages: [
          {
            role: "user",
            content: `Aşağıdaki dökümanın türünü belirle ve detaylı bir şekilde her bir başlık için eksiklerini belirle ve analiz et. Ayrıca içeriği tasarımsal açıdan da değerlendir. İçerik:\n\n${content}`,
          },
        ],
      });

      const aiAnalysis = chatResponse?.choices?.[0]?.message?.content;
      setAnalysis(aiAnalysis || "Analiz bulunamadı.");
    } catch (err) {
      setError("Analiz sırasında bir hata oluştu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcının sorduğu soruya AI'nin cevap vermesi için fonksiyon
  const askQuestion = async () => {
    if (!question.trim()) return;

    try {
      setQuestionLoading(true);
      setError(null);
      setAnswer(null);

      const chatResponse = await client.chat.complete({
        model: "pixtral-12b-2409",
        messages: [
          {
            role: "system",
            content: "Aşağıdaki dokümana dayanarak sorulara yanıt ver.",
          },
          {
            role: "user",
            content: `Döküman içeriği:\n\n${htmlContent}\n\nSoru: ${question}`,
          },
        ],
      });

      const aiAnswer = chatResponse?.choices?.[0]?.message?.content;
      setAnswer(aiAnswer || "Cevap bulunamadı.");
    } catch (err) {
      setError("Soru yanıtlama sırasında bir hata oluştu: " + err.message);
    } finally {
      setQuestionLoading(false);
    }
  };
  const parseAnalysis = (analysisText) => {
    return analysisText
      .split("###")
      .map((section) => section.trim())
      .filter((section) => section !== "");
  };

  return (
    <Container maxWidth="md" style={{ marginTop: "2rem" }}>
      <Card style={{ padding: "2rem", textAlign: "center" }}>
        <Typography variant="h4" gutterBottom color="primary">
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
          {loading ? <CircularProgress size={24} style={{ marginRight: "8px" }} /> : "Dökümanı Analiz Et"}
        </Button>

        {error && (
          <Alert severity="error" style={{ marginTop: "1rem" }}>
            {error}
          </Alert>
        )}

        {htmlContent && analysis && (

          <div style={{ marginTop: "2rem", textAlign: "left" }}>
            {/* Soru-Cevap Alanı */}
            <Typography variant="h5" color="primary" style={{ marginTop: "1.5rem" }} gutterBottom>
              Sorularınızı Sorun
            </Typography>
            <TextField
              fullWidth
              label="Döküman ile ilgili bir soru sorun"
              variant="outlined"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              margin="normal"
            />
            <Button
              variant="contained"
              color="primary"
              onClick={askQuestion}
              disabled={questionLoading || !question}
            >
              {questionLoading ? <CircularProgress size={24} style={{ marginRight: "8px" }} /> : " Gönder"}
            </Button>

            {answer && (
              <Card style={{ padding: "1rem", backgroundColor: "#f0f0f0", marginTop: "1rem" }}>
                <Typography variant="h6">Cevap:</Typography>
                <Typography variant="body1">{answer}</Typography>
              </Card>
            )}
            {/* Analiz Sonuçları */}
            <Typography variant="h5" color="primary" style={{ marginTop: "1.5rem" }} gutterBottom>
              Analiz Sonuçları
            </Typography>
            <Card style={{ padding: "1rem", backgroundColor: "#e3f2fd" }}>
              {parseAnalysis(analysis).map((section, index) => {
                const [title, ...content] = section.split("\n");
                return (
                  <div key={index} style={{ marginBottom: "1rem" }}>
                    <Typography variant="h6" color="primary">
                      {title.trim()}
                    </Typography>
                    <Typography variant="body1" style={{ whiteSpace: "pre-line" }}>
                      {content.join("\n").trim()}
                    </Typography>
                  </div>
                );
              })}
            </Card>

            {/* Döküman İçeriği */}
            <Typography variant="h5" color="primary" gutterBottom>
              Döküman İçeriği
            </Typography>
            <Card style={{ padding: "1rem" }}>
              <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
            </Card>




          </div>
        )}
      </Card>
    </Container>
  );
}

export default App;
