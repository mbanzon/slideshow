import { Component, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SlideshowService } from '../../services/slideshow';

@Component({
  selector: 'app-drop-images',
  imports: [],
  templateUrl: './drop-images.html',
  styleUrl: './drop-images.css'
})
export class DropImages implements OnInit, OnDestroy {
  loading = false;
  slideshowService = inject(SlideshowService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  
  async handleDrop(event: DragEvent) {
    this.loading = true;
    
    const items = Array.from(event.dataTransfer?.items ?? []);
    
    const files: File[] = [];
    
    for (const item of items) {
      if (item.type === "") {
        continue;
      }
      
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
    
    const toBeTraversed: FileSystemEntry[] = [];
    for (const item of items) {
      if (item.type !== "") {
        continue;
      }
      
      const e = item.webkitGetAsEntry();
      if (e) toBeTraversed.push(e);
    }
    
    for (const e of toBeTraversed) {
      await this.traverseFileTree(e, files);
    }
    
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    
    this.slideshowService.appendImageFiles(imageFiles);
    
    this.loading = false;
  }
  
  async traverseFileTree(
    item: FileSystemEntry,
    files: File[]
  ): Promise<void> {
    if (item.isFile) {
      await new Promise<void>((resolve) => {
        (item as FileSystemFileEntry).file((file) => {
          files.push(file);
          resolve();
        });
      });
    } else if (item.isDirectory) {
      const reader = (item as FileSystemDirectoryEntry).createReader();
      await this.readAllEntries(reader, files);
    }
  };
  
  readAllEntries(reader: FileSystemDirectoryReader, files: File[]) {
    return new Promise<void>((resolve, reject) => {
      const readEntriesRecursively = () => {
        reader.readEntries(async (entries) => {
          if (entries.length === 0) {
            // No more entries to read
            resolve();
            return;
          }
          
          for (const entry of entries) {
            await this.traverseFileTree(entry, files);
          }
          
          // Continue reading the next chunk of entries
          readEntriesRecursively();
        }, reject); // Handle errors if any
      };
      
      readEntriesRecursively();
    });
  };
  
  handleDragOver(event: Event) {
  }
  
  ngOnDestroy(): void {
    if (!this.isBrowser) {
      return;
    }

    window.removeEventListener('dragover', this.disableDefault);
    window.removeEventListener('drop', this.disableDefault);
  }
  
  disableDefault = (event: DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  };
  
  ngOnInit(): void {
    if (!this.isBrowser) {
      return;
    }

    window.addEventListener('dragover', this.disableDefault);
    window.addEventListener('drop', this.disableDefault);
  }
}
