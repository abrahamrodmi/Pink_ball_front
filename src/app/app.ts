import { Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface PredictionResponse {
  prediccion: string;
  confianza: number;
  detalle: Record<string, number>;
  error?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private http = inject(HttpClient);
  private readonly apiUrl = 'https://pink-ball-api.onrender.com/predict';

  selectedFile = signal<File | null>(null);
  imagePreview = signal<string | null>(null);
  isLoading = signal<boolean>(false);
  resultText = signal<string>('');
  errorMessage = signal<string | null>(null);

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedFile.set(file);
    this.errorMessage.set(null);
    this.resultText.set('');

    // Generar vista previa local
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  clasificarImagen(): void {
    const file = this.selectedFile();
    if (!file) {
      this.errorMessage.set('Por favor, selecciona una imagen primero.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formData = new FormData();
    // El nombre 'file' debe coincidir exactamente con: file: UploadFile = File(...)
    formData.append('file', file);

    this.http.post<PredictionResponse>(this.apiUrl, formData).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.error) {
          this.errorMessage.set(res.error);
          return;
        }
        this.resultText.set(this.formatearResultados(res));
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error(err);
        this.errorMessage.set('Error al conectar con la API. Verifica que FastAPI esté corriendo en el puerto 8000.');
      }
    });
  }

  private formatearResultados(res: PredictionResponse): string {
    const confianzaPct = (res.confianza * 100).toFixed(2);
    let texto = `Predicción principal: ${res.prediccion}\n`;
    texto += `Confianza: ${confianzaPct}% (Probabilidad: ${res.confianza.toFixed(4)})\n`;
    texto += `----------------------------------------\n`;
    texto += `Detalle por clase:\n`;

    // Ordenar clases de mayor a menor probabilidad
    const entradasOrdenadas = Object.entries(res.detalle).sort((a, b) => b[1] - a[1]);

    for (const [clase, prob] of entradasOrdenadas) {
      const porcentaje = (prob * 100).toFixed(2);
      texto += `• ${clase}: ${porcentaje}% (Prob: ${prob.toFixed(4)})\n`;
    }

    return texto;
  }
}

//https://pink-ball-api.onrender.com