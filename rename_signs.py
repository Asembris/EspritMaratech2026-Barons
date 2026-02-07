"""
Script pour renommer automatiquement les captures d'écran manuelles
Version automatique (sans interaction)
Les fichiers sont triés par timestamp et sont dans l'ordre A-Z puis 1-9
"""

import os
import shutil

def auto_rename_signs():
    source_dir = "img_signs_manual"
    target_dir = "signs"
    
    # S'assurer que le dossier cible existe
    os.makedirs(target_dir, exist_ok=True)
    
    # Lister et trier les fichiers par nom (ordre chronologique de création)
    files = sorted([f for f in os.listdir(source_dir) if f.endswith('.png')])
    
    print(f"📁 Trouvé {len(files)} fichiers dans '{source_dir}'")
    
    # Définir l'ordre des caractères attendu
    # A-Z (26 lettres) puis 1-9 (9 chiffres) = 35 fichiers minimum
    # Avec 39 fichiers, il pourrait y avoir des extras ou le 0
    
    letters = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')  # 26 lettres
    
    copied = 0
    idx = 0
    
    print("\n📄 Copie des lettres...")
    for letter in letters:
        if idx < len(files):
            old_path = os.path.join(source_dir, files[idx])
            new_path = os.path.join(target_dir, f"letter_{letter.lower()}.png")
            shutil.copy2(old_path, new_path)
            print(f"✓ {files[idx][:35]:<35} -> letter_{letter.lower()}.png")
            copied += 1
            idx += 1
    
    # Chiffres restants
    remaining = len(files) - 26
    print(f"\n🔢 Copie des chiffres ({remaining} restants)...")
    
    if remaining > 0:
        # Si 10+ restants: 0-9, sinon 1-9
        start_num = 0 if remaining >= 10 else 1
        for i in range(remaining):
            if idx < len(files):
                old_path = os.path.join(source_dir, files[idx])
                num = start_num + i
                new_path = os.path.join(target_dir, f"num_{num}.png")
                shutil.copy2(old_path, new_path)
                print(f"✓ {files[idx][:35]:<35} -> num_{num}.png")
                copied += 1
                idx += 1
    
    print(f"\n✅ Terminé! {copied} fichiers copiés dans '{target_dir}/'")
    print("\n📝 Rafraîchissez la page pour voir les nouvelles images!")

if __name__ == "__main__":
    auto_rename_signs()
