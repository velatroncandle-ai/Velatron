#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script para generar comics.json con todos los cómics disponibles
Ejecutar cuando agregues nuevos cómics para actualizar el archivo JSON
"""

import os
import json

UPLOAD_FOLDER = 'comics'

def generate_comics_json():
    """Genera archivo comics.json con la estructura de cómics"""
    comics_data = {}
    
    if not os.path.exists(UPLOAD_FOLDER):
        print(f"❌ No existe la carpeta {UPLOAD_FOLDER}")
        return
    
    print("📁 Escaneando carpeta comics...")
    
    # Recorrer carpetas de cómics
    for comic_folder in os.listdir(UPLOAD_FOLDER):
        comic_path = os.path.join(UPLOAD_FOLDER, comic_folder)
        
        if os.path.isdir(comic_path):
            # Recorrer temporadas
            for season in os.listdir(comic_path):
                season_path = os.path.join(comic_path, season)
                
                if os.path.isdir(season_path):
                    # Obtener todas las imágenes AVIF (excepto portada principal)
                    image_files = [f for f in os.listdir(season_path) 
                                 if f.endswith('.avif') and f != 'principal.avif']
                    
                    if not image_files:
                        continue
                    
                    # Ordenar numéricamente (1, 2, 3... no 1, 10, 11, 2...)
                    import re
                    def extract_number(filename):
                        match = re.search(r'(\d+)', filename)
                        return int(match.group(1)) if match else 999999
                    
                    image_files.sort(key=extract_number)
                    
                    # Construir rutas relativas
                    image_paths = [
                        f'comics/{comic_folder}/{season}/{img}'
                        for img in image_files
                    ]
                    
                    # Key del cómic
                    comic_key = f'{comic_folder}-{season}'
                    
                    comics_data[comic_key] = {
                        'images': image_paths,
                        'cover': f'comics/{comic_folder}/{season}/principal.avif',
                        'folder': comic_folder,
                        'season': season,
                        'count': len(image_paths)
                    }
                    
                    print(f"  ✅ {comic_key}: {len(image_paths)} imágenes")
    
    # Guardar JSON
    output_file = 'comics.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(comics_data, f, indent=2, ensure_ascii=False)
    
    print(f"\n✅ Archivo generado: {output_file}")
    print(f"📊 Total de cómics: {len(comics_data)}")
    
    return comics_data

if __name__ == '__main__':
    print("🚀 Generador de comics.json")
    print("=" * 50)
    
    result = generate_comics_json()
    
    if result:
        print("\n💡 Ahora puedes usar este archivo JSON en tu web sin necesidad del servidor Python")
        print("   Solo carga comics.json con fetch y úsalo como fallback")
    else:
        print("\n❌ No se pudo generar el archivo")
