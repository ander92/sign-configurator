import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  // Image state
  imageFile?: File;
  buildingImageBase64?: string;
  imagePreview?: string;
  generatedImage?: string;
  isGenerating = false;
  openAiError?: string;
  validationError?: string;

  // Form fields for prompt builder
  signText = '';
  signType = '';
  signStyle = '';
  lightColor = '';
  signPosition = '';

  // Options
  signTypeOptions = [
    { value: '', label: '— Alege tipul —' },
    { value: 'litere volumetrice', label: 'Litere volumetrice' },
    { value: 'casetă luminoasă', label: 'Casetă luminoasă' },
    { value: 'neon LED', label: 'Neon LED' },
    { value: 'litere PVC iluminate', label: 'Litere PVC iluminate' },
    { value: 'banner luminat', label: 'Banner luminat' },
    { value: 'totem publicitar', label: 'Totem publicitar' },
  ];

  signStyleOptions = [
    { value: '', label: '— Alege stilul —' },
    { value: 'modern', label: 'Modern' },
    { value: 'clasic', label: 'Clasic' },
    { value: 'industrial', label: 'Industrial' },
    { value: 'minimalist', label: 'Minimalist' },
    { value: 'retro/vintage', label: 'Retro / Vintage' },
    { value: 'luxos/premium', label: 'Luxos / Premium' },
  ];

  lightColorOptions = [
    { value: '', label: '— Alege culoarea —' },
    { value: 'alb cald (3000K)', label: 'Alb cald (3000K)' },
    { value: 'alb rece (6000K)', label: 'Alb rece (6000K)' },
    { value: 'RGB multicolor', label: 'RGB multicolor' },
    { value: 'roșu', label: 'Roșu' },
    { value: 'albastru', label: 'Albastru' },
    { value: 'verde', label: 'Verde' },
    { value: 'auriu', label: 'Auriu' },
  ];

  positionOptions = [
    { value: '', label: '— Alege poziția —' },
    { value: 'deasupra ușii de intrare', label: 'Deasupra ușii' },
    { value: 'în centrul fațadei', label: 'Centrul fațadei' },
    { value: 'pe colțul clădirii', label: 'Colțul clădirii' },
    { value: 'pe acoperiș', label: 'Pe acoperiș' },
    { value: 'la nivelul etajului 1', label: 'Etajul 1' },
  ];

  // Generated prompt (editable)
  prompt = '';

  sizeOptions = ['1024x1024', '1024x1536', '1536x1024'];
  selectedSize = '1536x1024';

  constructor(private http: HttpClient) {}

  /** Build prompt automatically from form fields */
  buildPrompt(): void {
    if (!this.signText.trim()) {
      this.prompt = '';
      return;
    }

    const parts: string[] = [];

    if (this.buildingImageBase64) {
      parts.push(`Adaugă pe fațada clădirii din imagine o firmă luminoasă cu textul „${this.signText.trim()}"`);
    } else {
      parts.push(`Generează o firmă luminoasă cu textul „${this.signText.trim()}"`);
    }

    if (this.signType) {
      parts.push(`tip: ${this.signType}`);
    }
    if (this.signStyle) {
      parts.push(`stil ${this.signStyle}`);
    }
    if (this.lightColor) {
      parts.push(`iluminare ${this.lightColor}`);
    }
    if (this.signPosition) {
      parts.push(`poziționată ${this.signPosition}`);
    }

    if (this.buildingImageBase64) {
      parts.push('Firma trebuie să se integreze natural în arhitectura clădirii, cu perspectivă și iluminare realistă');
    }

    this.prompt = parts.join(', ') + '.';
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }

    this.imageFile = input.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      this.openAiError = undefined;
      this.buildingImageBase64 = reader.result as string;
      this.imagePreview = this.buildingImageBase64;
      this.generatedImage = undefined;
      // Rebuild prompt to reflect image context
      this.buildPrompt();
    };
    reader.readAsDataURL(this.imageFile);
  }

  removeImage(): void {
    this.imageFile = undefined;
    this.buildingImageBase64 = undefined;
    this.imagePreview = undefined;
    this.generatedImage = undefined;
    this.buildPrompt();
  }

  generateImage(): void {
    if (!this.prompt.trim()) {
      this.openAiError = 'Te rugăm completează formularul sau scrie un prompt.';
      return;
    }

    this.validationError = undefined;
    if (this.prompt.length > 2000) {
      this.validationError = 'Prompt prea lung (maxim 2000 de caractere).';
      return;
    }

    if (this.buildingImageBase64) {
      try {
        const b64 = this.buildingImageBase64.split(',')[1] ?? '';
        const decodedLen = atob(b64).length;
        if (decodedLen > 5 * 1024 * 1024) {
          this.validationError = 'Imaginea încărcată este prea mare (maxim 5 MB).';
          return;
        }
      } catch (e) {
        this.validationError = 'Imagine încărcată invalidă.';
        return;
      }
    }

    this.isGenerating = true;
    this.openAiError = undefined;

    const payload: any = {
      prompt: this.prompt.trim(),
      size: this.selectedSize
    };

    if (this.buildingImageBase64) {
      payload.imageBase64 = this.buildingImageBase64;
    }

    this.http.post<{ success: boolean; image: string }>(`${environment.apiUrl}/openai/generate`, payload).subscribe({
      next: (response) => {
        this.isGenerating = false;
        if (!response.success) {
          this.openAiError = 'Generarea imaginii a eșuat. Încearcă un alt prompt.';
          return;
        }
        // The response is the complete final image (building + sign integrated)
        this.generatedImage = response.image;
      },
      error: (error) => {
        this.isGenerating = false;
        this.openAiError = error?.error?.error || 'Nu se poate genera imaginea în acest moment.';
      }
    });
  }

  downloadImage(): void {
    const target = this.generatedImage ?? this.imagePreview;
    if (!target) return;
    const a = document.createElement('a');
    a.href = target;
    a.download = 'firma-generata.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  reset(): void {
    this.imageFile = undefined;
    this.buildingImageBase64 = undefined;
    this.imagePreview = undefined;
    this.generatedImage = undefined;
    this.signText = '';
    this.signType = '';
    this.signStyle = '';
    this.lightColor = '';
    this.signPosition = '';
    this.prompt = '';
    this.validationError = undefined;
    this.openAiError = undefined;
  }
}
