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
  const [language, setLanguage] = useState("tr"); // Default language is Turkish

  // Function to handle language change
  const handleLanguageChange = (lang) => {
    setLanguage(lang);
  };

  // Function to get the full language name based on the selected language code
  const getFullLanguageName = (lang) => {
    const languageMap = {
      tr: "Türkçe",
      en: "English",
    };
    return languageMap[lang];
  };

  // Update the content based on the selected language
  const getText = (key) => {
    const texts = {
      tr: {
        title: "Döküman Analizi",
        urlLabel: "Google Docs URL'sini girin",
        analyzeButton: "Dökümanı Analiz Et",
        questionLabel: "Döküman ile ilgili bir soru sorun",
        sendButton: "Gönder",
        answerLabel: "Cevap:",
        analysisResults: "Analiz Sonuçları",
        documentContent: "Döküman İçeriği",
        error: "Bir hata oluştu",
      },
      en: {
        title: "Document Analysis",
        urlLabel: "Enter Google Docs URL",
        analyzeButton: "Analyze Document",
        questionLabel: "Ask a question about the document",
        sendButton: "Send",
        answerLabel: "Answer:",
        analysisResults: "Analysis Results",
        documentContent: "Document Content",
        error: "An error occurred",
      },
    };
    return texts[language][key];
  };

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
            content: `Aşağıdaki dökümanın türünü belirle ve detaylı bir şekilde her bir başlık için eksiklerini belirle ve analiz et. Ayrıca içeriği tasarımsal açıdan da değerlendir. İçerik:\n\n${content}\n\nLütfen yanıtı ${getFullLanguageName(language)} dilinde ver.`,
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
            content: `Aşağıdaki dokümana dayanarak sorulara yanıt ver. Lütfen yanıtı ${getFullLanguageName(language)} dilinde ver.`,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <Typography variant="h4" gutterBottom color="primary">
            {getText("title")}
          </Typography>
          {/* Language Selector using MUI Buttons */}
          <div>
            <Button
              variant={language === "tr" ? "contained" : "outlined"}
              color={language === "tr" ? "primary" : "default"}
              onClick={() => handleLanguageChange("tr")}
              style={{ marginRight: "8px" }}
            >
              TR
            </Button>
            <Button
              variant={language === "en" ? "contained" : "outlined"}
              color={language === "en" ? "primary" : "default"}
              onClick={() => handleLanguageChange("en")}
            >
              EN
            </Button>
          </div>
        </div>

        <TextField
          fullWidth
          label={getText("urlLabel")}
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
          {loading ? <CircularProgress size={24} style={{ marginRight: "8px" }} /> : getText("analyzeButton")}
        </Button>

        {error && (
          <Alert severity="error" style={{ marginTop: "1rem" }}>
            {getText("error")}: {error}
          </Alert>
        )}

        {htmlContent && analysis && (
          <div style={{ marginTop: "2rem", textAlign: "left" }}>
            <Typography variant="h5" color="primary" style={{ marginTop: "1.5rem" }} gutterBottom>
              {getText("questionLabel")}
            </Typography>
            <TextField
              fullWidth
              label={getText("questionLabel")}
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
              {questionLoading ? <CircularProgress size={24} style={{ marginRight: "8px" }} /> : getText("sendButton")}
            </Button>

            {answer && (
              <Card style={{ padding: "1rem", backgroundColor: "#f0f0f0", marginTop: "1rem" }}>
                <Typography variant="h6">{getText("answerLabel")}</Typography>
                <Typography variant="body1">{answer}</Typography>
              </Card>
            )}
            <Typography variant="h5" color="primary" style={{ marginTop: "1.5rem" }} gutterBottom>
              {getText("analysisResults")}
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

            <Typography variant="h5" color="primary" gutterBottom>
              {getText("documentContent")}
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
