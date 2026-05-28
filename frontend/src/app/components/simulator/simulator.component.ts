import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

interface SimulationResult {
  text: string;
}

@Component({
  selector: 'app-simulator',
  templateUrl: './simulator.component.html',
  styleUrls: ['./simulator.component.css']
})
export class SimulatorComponent {
  projectName = 'Lemnoor Decor';
  logoFile?: File;
  adType = 'Caseta iluminata';
  adTypes = [
    'Caseta iluminata',
    'Litere volumetrice iluminate (Iluminare frontala)',
    'Litere volumetrice iluminate (Iluminare tip halou)',
    'Litere volumetrice neiluminate',
    'Sigla iluminata',
    'Semn neon led'
  ];

  dimensions = '';

  lighting = 'Neutra';
  lightingOptions = ['Rece', 'Neutra', 'Calda', 'Colorata'];

  color = '';

  locationImage?: string;

  compiledPrompt = '';
  isGenerating = false;
  simulation?: string;
  error?: string;

  constructor(private http: HttpClient) {}

  onLogoChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.logoFile = input.files[0];
  }

  onLocationImageChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    const f = input.files[0];
    const reader = new FileReader();
    reader.onload = () => (this.locationImage = reader.result as string);
    reader.readAsDataURL(f);
  }

  compileSentence(): string {
    const parts: string[] = [];
    parts.push(`Proiect: ${this.projectName}`);
    parts.push(`Tip reclamă: ${this.adType}`);
    if (this.dimensions) parts.push(`Dimensiuni: ${this.dimensions}`);
    parts.push(`Tip luminare: ${this.lighting}`);
    if (this.color) parts.push(`Culoare: ${this.color}`);
    if (this.locationImage) parts.push(`Background: imagine încărcată de client.`);
    return parts.join(' | ');
  }

  async generateSimulation() {
    this.error = undefined;
    this.simulation = undefined;
    this.compiledPrompt = this.compileSentence();
    this.isGenerating = true;

    try {
      const payload: any = { prompt: this.compiledPrompt };
      if (this.locationImage) payload.locationImage = this.locationImage;

      const res = await this.http.post<SimulationResult>('/api/chat', payload).toPromise();
      this.simulation = res?.text ?? 'Fără rezultat.';
    } catch (e: any) {
      this.error = e?.error?.error || 'Eroare la generare.';
    } finally {
      this.isGenerating = false;
    }
  }

  async requestOffer(contactInfo: { name: string; email: string; phone?: string }) {
    const payload = {
      contact: contactInfo,
      project: this.projectName,
      details: this.compiledPrompt,
    } as any;
    if (this.locationImage) payload.locationImage = this.locationImage;
    try {
      await this.http.post('/api/offer', payload).toPromise();
      alert('Cererea de ofertă a fost trimisă. Vom reveni curând.');
    } catch (e: any) {
      alert('Eroare la trimitere ofertă: ' + (e?.error?.error || e?.message || 'unknown'));
    }
  }
}
