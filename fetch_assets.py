import requests
import os
import sys

def fetch_wikimedia_image(word, output_dir):
    print(f"Searching for: {word}...")
    # Modified search to focus on Clipart and Vector styles
    search_url = "https://commons.wikimedia.org/w/api.php"
    params = {
        "action": "query",
        "format": "json",
        "list": "search",
        "srsearch": f"{word} clipart",
        "srlimit": 5,
        "srnamespace": 6  # File namespace
    }
    
    # Updated to a more standard browser User-Agent to avoid blocks
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        # Search specifically for PNG files
        params["srsearch"] = f"{word} clipart"
        response_raw = requests.get(search_url, params=params, headers=headers)
        
        if response_raw.status_code != 200:
            print(f"Error: Received status code {response_raw.status_code} for {word}")
            return False
            
        try:
            response = response_raw.json()
        except Exception:
            print(f"Error: Failed to decode JSON for {word}. Response snippet: {response_raw.text[:100]}")
            return False
            
        search_results = response.get("query", {}).get("search", [])
        
        if not search_results:
            # Fallback search
            params["srsearch"] = f"{word} vector illustration"
            response = requests.get(search_url, params=params).json()
            search_results = response.get("query", {}).get("search", [])

        for result in search_results:
            title = result["title"]
            # Get the actual direct URL for the file
            image_info_params = {
                "action": "query",
                "format": "json",
                "prop": "imageinfo",
                "iiprop": "url",
                "titles": title
            }
            info_response = requests.get(search_url, params=image_info_params, headers=headers).json()
            pages = info_response.get("query", {}).get("pages", {})
            for page_id in pages:
                image_url = pages[page_id].get("imageinfo", [{}])[0].get("url")
                if image_url:
                    # Enforce PNG strictly as requested
                    if not image_url.lower().endswith('.png'):
                        continue
                        
                    # Download the image
                    img_response = requests.get(image_url, headers=headers)
                    img_data = img_response.content
                    
                    # Basic check: if it's less than 500 bytes, it's probably an error message
                    if len(img_data) < 500:
                        print(f"Skipping {word}: Downloaded file too small (likely error message)")
                        continue
                        
                    filename = f"{word}.png"
                    filepath = os.path.join(output_dir, filename)
                    
                    with open(filepath, 'wb') as f:
                        f.write(img_data)
                    print(f"Downloaded: {filename}")
                    return True
        
        print(f"No suitable image found for: {word}")
        return False
        
    except Exception as e:
        print(f"Error fetching {word}: {e}")
        return False

if __name__ == "__main__":
    # Certification list (extracted from user image)
    certification_words = [
        "answer", "afternoon", "alphabet", "apple", "ball", "beach", "beautiful", "bee", "boot", 
        "brother", "brown", "car", "chicken", "children", "chocolate", "class", "cousin", "cow", 
        "crayon", "do", "dog", "eraser", "evening", "fantastic", "favourite", "find", "food", 
        "friend", "giraffe", "good", "guitar", "hair", "happy", "have", "honey", "jeans", 
        "jellyfish", "kite", "learn", "lesson", "listen", "little", "lunch", "meat", "morning", 
        "mouse", "music", "name", "park", "person", "picture", "please", "polar bear", 
        "question", "rain", "scary", "school", "sea", "sing", "sister", "skateboard", "small", 
        "sorry", "talk", "teddy bear", "thing", "tiger", "try", "ugly", "want"
    ]
    
    # Science list (Extracted from list.xlsx to avoid PermissionError)
    science_words = [
        'attract', 'brick', 'bulb', 'burn', 'change', 'chemical', 'clay', 'concrete', 'cotton', 
        'curved', 'dark', 'daytime', 'direction', 'Earth', 'electricity', 'energy', 'fabric', 
        'firefly', 'flashlight', 'floodlight', 'force', 'freezing', 'friction', 'glass', 
        'gravity', 'ground', 'hard', 'hypothesis', 'investigation', 'iron', 'irreversible', 
        'leather', 'lightning', 'magnetism', 'manufactured', 'materials', 'measure', 'melting', 
        'metal', 'Moon', 'move', 'natural', 'observe', 'oil', 'plastic', 'polyester', 'predict', 
        'produce', 'record', 'resistance', 'result', 'reversible', 'rock', 'rough', 'runny', 
        'sand', 'scientist', 'see', 'sky', 'slow down', 'smooth', 'soft', 'source', 'speed up', 
        'squeeze', 'star', 'steel', 'straight', 'streetlight', 'stretch', 'strong', 'Sun', 
        'transparent', 'weak', 'wool'
    ]
    
    all_words = list(set(certification_words + science_words))
    
    assets_dir = r"C:\Users\oscar\OneDrive\Desktop\Spelling_Bee_Assets"
    
    if not os.path.exists(assets_dir):
        os.makedirs(assets_dir)
        
    missing_assets = []
    
    print(f"Starting mass acquisition for {len(all_words)} words...")
    
    for word in all_words:
        # Check if we already have it to avoid redundant downloads
        exists = any(os.path.exists(os.path.join(assets_dir, f"{word}{ext}")) for ext in ['.png', '.jpg', '.jpeg', '.svg'])
        if exists:
            print(f"Skipping {word}, already exists.")
            continue
            
        if not fetch_wikimedia_image(word, assets_dir):
            missing_assets.append(word)
            
    with open(os.path.join(assets_dir, "missing_assets.txt"), "w") as f:
        for word in missing_assets:
            f.writelines(f"{word}\n")
    
    print(f"Finished! Missing assets: {len(missing_assets)}")
