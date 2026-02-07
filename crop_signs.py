"""
Script pour découper précisément les images de signes de l'alphabet
depuis l'image principale (1-1030x773.png)
Version 3: Coordonnées très précises pour éviter tout chevauchement
"""

from PIL import Image
import os

def crop_signs():
    # Charger l'image principale
    img_path = "1-1030x773.png"
    img = Image.open(img_path)
    width, height = img.size
    print(f"Image size: {width}x{height}")
    
    # Créer le dossier de sortie
    output_dir = "signs"
    os.makedirs(output_dir, exist_ok=True)
    
    # Version 3: Coordonnées très précises pour chaque signe
    # Format: (left, top, right, bottom) - coordonnées absolues
    
    letters = {
        # Rangée 1: A-I
        'A': (15, 10, 90, 160),
        'B': (115, 5, 190, 165),
        'C': (225, 5, 300, 165),
        'D': (340, 5, 420, 165),
        'E': (455, 5, 520, 165),
        'F': (545, 5, 625, 165),
        'G': (665, 20, 755, 165),
        'H': (795, 20, 885, 165),
        'I': (925, 10, 1005, 165),
        
        # Rangée 2: J-Q (attention aux chevauchements)
        'J': (15, 180, 85, 340),
        'K': (110, 175, 190, 340),
        'L': (225, 175, 305, 340),
        'M': (340, 190, 420, 340),      # M réduit pour éviter L et N
        'N': (455, 190, 530, 340),      # N réduit
        'O': (565, 175, 650, 340),      # O bien isolé (problématique avant)
        'P': (750, 175, 860, 360),
        'Q': (895, 175, 1015, 360),
        
        # Rangée 3: R-Z
        'R': (15, 365, 85, 530),
        'S': (110, 365, 185, 530),
        'T': (215, 365, 290, 530),
        'U': (315, 365, 390, 530),
        'V': (420, 365, 500, 530),
        'W': (525, 365, 605, 530),
        'X': (635, 365, 715, 530),
        'Y': (755, 365, 860, 530),
        'Z': (900, 365, 1015, 530),
    }
    
    numbers = {
        # Rangée 4: 1-9
        '1': (15, 555, 90, 765),
        '2': (115, 545, 200, 765),
        '3': (240, 575, 320, 765),
        '4': (355, 555, 435, 765),
        '5': (470, 545, 550, 765),
        '6': (585, 565, 665, 765),
        '7': (700, 545, 780, 765),
        '8': (815, 545, 895, 765),
        '9': (930, 545, 1010, 765),
    }

    print("\n📄 Découpage des lettres (A-Z)...")
    for letter, (left, top, right, bottom) in letters.items():
        # S'assurer qu'on ne dépasse pas les limites
        right = min(right, width)
        bottom = min(bottom, height)
        
        cropped = img.crop((left, top, right, bottom))
        output_path = os.path.join(output_dir, f"letter_{letter.lower()}.png")
        cropped.save(output_path)
        print(f"✓ {letter}: ({left}, {top}, {right}, {bottom}) -> {output_path}")
    
    print("\n🔢 Découpage des chiffres (1-9)...")
    for num, (left, top, right, bottom) in numbers.items():
        right = min(right, width)
        bottom = min(bottom, height)
        
        cropped = img.crop((left, top, right, bottom))
        output_path = os.path.join(output_dir, f"num_{num}.png")
        cropped.save(output_path)
        print(f"✓ {num}: ({left}, {top}, {right}, {bottom}) -> {output_path}")
    
    print(f"\n✅ Terminé! {len(letters)} lettres et {len(numbers)} chiffres découpés")

if __name__ == "__main__":
    crop_signs()
