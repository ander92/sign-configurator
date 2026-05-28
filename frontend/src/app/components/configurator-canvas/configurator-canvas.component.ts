import { Component, HostListener, OnInit } from '@angular/core';

interface SignConfig {
  text: string;
  font: string;
  color: string;
  width: number;
  height: number;
  top: number;
  left: number;
}

@Component({
  selector: 'app-configurator-canvas',
  templateUrl: './configurator-canvas.component.html',
  styleUrls: ['./configurator-canvas.component.css']
})
export class ConfiguratorCanvasComponent implements OnInit {
  imagePreview?: string;
  sign: SignConfig = {
    text: 'Your Store',
    font: 'sans-serif',
    color: '#f8fafc',
    width: 260,
    height: 80,
    top: 120,
    left: 120
  };
  dragging = false;
  resizing = false;
  resizeDirection: 'nw' | 'ne' | 'sw' | 'se' | null = null;
  dragOffset = { x: 0, y: 0 };
  pointerStart = { x: 0, y: 0 };
  sizeStart = { width: 0, height: 0, top: 0, left: 0 };

  ngOnInit(): void {
    this.imagePreview = localStorage.getItem('buildingImage') ?? undefined;
  }

  startDrag(event: MouseEvent): void {
    event.stopPropagation();
    this.dragging = true;
    this.dragOffset = {
      x: event.offsetX,
      y: event.offsetY
    };
  }

  startResize(event: MouseEvent, direction: 'nw' | 'ne' | 'sw' | 'se'): void {
    event.stopPropagation();
    this.resizing = true;
    this.resizeDirection = direction;
    this.pointerStart = { x: event.clientX, y: event.clientY };
    this.sizeStart = {
      width: this.sign.width,
      height: this.sign.height,
      top: this.sign.top,
      left: this.sign.left
    };
  }

  moveSign(direction: 'up' | 'down' | 'left' | 'right'): void {
    const step = 10;
    if (direction === 'up') {
      this.sign.top = Math.max(0, this.sign.top - step);
    }
    if (direction === 'down') {
      this.sign.top += step;
    }
    if (direction === 'left') {
      this.sign.left = Math.max(0, this.sign.left - step);
    }
    if (direction === 'right') {
      this.sign.left += step;
    }
  }

  decreaseWidth(): void {
    this.sign.width = Math.max(80, this.sign.width - 10);
  }

  increaseWidth(): void {
    this.sign.width = Math.min(600, this.sign.width + 10);
  }

  decreaseHeight(): void {
    this.sign.height = Math.max(40, this.sign.height - 10);
  }

  increaseHeight(): void {
    this.sign.height = Math.min(220, this.sign.height + 10);
  }

  @HostListener('document:mouseup')
  stopDrag(): void {
    this.dragging = false;
    this.resizing = false;
    this.resizeDirection = null;
  }

  @HostListener('document:mousemove', ['$event'])
  onDrag(event: MouseEvent): void {
    if (this.dragging) {
      this.sign.left = event.clientX - this.dragOffset.x - this.canvasRect.left;
      this.sign.top = event.clientY - this.dragOffset.y - this.canvasRect.top;
    }

    if (this.resizing && this.resizeDirection) {
      const dx = event.clientX - this.pointerStart.x;
      const dy = event.clientY - this.pointerStart.y;
      const minWidth = 80;
      const minHeight = 40;

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

      this.sign.width = width;
      this.sign.height = height;
      this.sign.top = top;
      this.sign.left = left;
    }
  }

  get canvasRect(): DOMRect {
    const canvas = document.querySelector('.preview-canvas');
    return canvas?.getBoundingClientRect() ?? new DOMRect();
  }
}
