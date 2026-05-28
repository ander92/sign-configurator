import { Component, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css']
})
export class UploadComponent {
  imageFile?: File;
  buildingImageBase64?: string;
  imagePreview?: string;
  prompt = 'Lemnoor';
  isGenerating = false;
  openAiError?: string;
  validationError?: string;
  sizeOptions = ['1024x1024', '1024x1536', '1536x1024', 'auto'];
  selectedSize = '1024x1024';

  // generated sign overlay
  generatedSign?: string; // data URL
  sign = { top: 50, left: 50, width: 200, height: 80 };
  draggingSign = false;
  resizingSign = false;
  resizeDirection: 'nw' | 'ne' | 'sw' | 'se' | null = null;
  dragOffset = { x: 0, y: 0 };
  pointerStart = { x: 0, y: 0 };
  sizeStart = { width: 0, height: 0, top: 0, left: 0 };

  constructor(private http: HttpClient) {}

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
      localStorage.setItem('buildingImage', this.imagePreview ?? '');
    };
    reader.readAsDataURL(this.imageFile);
  }

  generateImage(): void {
    if (!this.prompt.trim()) {
      this.openAiError = 'Te rugăm introdu un prompt pentru a genera o imagine.';
      return;
    }
    // client-side validation
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

        if (this.buildingImageBase64) {
          // response.image is the sign overlay with transparent background
          this.generatedSign = response.image;
          // keep background as uploaded image
          this.imagePreview = this.buildingImageBase64;
          localStorage.setItem('buildingImage', this.imagePreview ?? '');
        } else {
          // no background provided — response is full image
          this.generatedSign = undefined;
          this.imagePreview = response.image;
          localStorage.setItem('buildingImage', response.image);
        }
      },
      error: (error) => {
        this.isGenerating = false;
        this.openAiError = error?.error?.error || 'Nu se poate genera imaginea în acest moment.';
      }
    });
  }

  proceed(): void {
    // deprecated: configurator removed — keep image in localStorage
    if (this.imagePreview) {
      localStorage.setItem('buildingImage', this.imagePreview);
    }
  }

  downloadImage(): void {
    const target = this.generatedSign ?? this.imagePreview;
    if (!target) return;
    const a = document.createElement('a');
    a.href = target;
    a.download = this.generatedSign ? 'sign.png' : 'generated.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  reset(): void {
    this.imageFile = undefined;
    this.buildingImageBase64 = undefined;
    this.imagePreview = undefined;
    this.prompt = '';
    localStorage.removeItem('buildingImage');
    this.validationError = undefined;
    this.openAiError = undefined;
    this.generatedSign = undefined;
  }

  startDragSign(event: MouseEvent): void {
    event.stopPropagation();
    this.draggingSign = true;
    const target = event.target as HTMLElement;
    // use offset within the sign element
    this.dragOffset = { x: (event as any).offsetX, y: (event as any).offsetY };
  }

  startResizeSign(event: MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se'): void {
    event.stopPropagation();
    this.resizingSign = true;
    this.resizeDirection = direction;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.sizeStart = { width: this.sign.width, height: this.sign.height, top: this.sign.top, left: this.sign.left };
  }

  @HostListener('document:mouseup')
  stopPointer(): void {
    this.draggingSign = false;
    this.resizingSign = false;
    this.resizeDirection = null;
  }

  @HostListener('document:mousemove', ['$event'])
  onPointerMove(event: MouseEvent): void {
    const canvasRect = this.canvasRect;
    if (this.draggingSign) {
      this.sign.left = Math.max(0, Math.min(canvasRect.width - this.sign.width, event.clientX - this.dragOffset.x - canvasRect.left));
      this.sign.top = Math.max(0, Math.min(canvasRect.height - this.sign.height, event.clientY - this.dragOffset.y - canvasRect.top));
    }

    if (this.resizingSign && this.resizeDirection) {
      const dx = event.clientX - this.pointerStart.x;
      const dy = event.clientY - this.pointerStart.y;
      const minWidth = 40;
      const minHeight = 20;

      let width = this.sizeStart.width;
      let height = this.sizeStart.height;
      let top = this.sizeStart.top;
      let left = this.sizeStart.left;

      if (this.resizeDirection.includes('e')) {
        width = Math.max(minWidth, this.sizeStart.width + dx);
      }
      if (this.resizeDirection.includes('s')) {
        height = Math.max(minHeight, this.sizeStart.height + dy);
      }
      if (this.resizeDirection.includes('w')) {
        width = Math.max(minWidth, this.sizeStart.width - dx);
        left = this.sizeStart.left + dx;
      }
      if (this.resizeDirection.includes('n')) {
        height = Math.max(minHeight, this.sizeStart.height - dy);
        top = this.sizeStart.top + dy;
      }

      // clamp inside canvas
      width = Math.min(width, canvasRect.width);
      height = Math.min(height, canvasRect.height);

      this.sign.width = width;
      this.sign.height = height;
      this.sign.top = Math.max(0, Math.min(canvasRect.height - height, top));
      this.sign.left = Math.max(0, Math.min(canvasRect.width - width, left));
    }
  }

  get canvasRect(): DOMRect {
    const canvas = document.querySelector('.preview-canvas');
    return canvas?.getBoundingClientRect() ?? new DOMRect();
  }

  async downloadCombined(): Promise<void> {
    if (!this.imagePreview) return;
    const bg = new Image();
    bg.src = this.imagePreview;
    await new Promise((r) => (bg.onload = r));

    const canvas = document.createElement('canvas');
    const naturalW = bg.naturalWidth || bg.width;
    const naturalH = bg.naturalHeight || bg.height;
    canvas.width = naturalW;
    canvas.height = naturalH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bg, 0, 0, naturalW, naturalH);

    if (this.generatedSign) {
      const signImg = new Image();
      signImg.src = this.generatedSign;
      await new Promise((r) => (signImg.onload = r));

      // compute scale between displayed canvas and natural size
      const rect = this.canvasRect;
      const scaleX = naturalW / rect.width;
      const scaleY = naturalH / rect.height;

      const sx = Math.round(this.sign.left * scaleX);
      const sy = Math.round(this.sign.top * scaleY);
      const sw = Math.round(this.sign.width * scaleX);
      const sh = Math.round(this.sign.height * scaleY);

      ctx.drawImage(signImg, sx, sy, sw, sh);
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'composite.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
