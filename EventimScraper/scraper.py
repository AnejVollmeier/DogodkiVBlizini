import requests
import json
from bs4 import BeautifulSoup
import re
import os
import urllib.parse
from pathlib import Path
from datetime import datetime
import time
import random

# User agent is one of the most important headers
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'upgrade-insecure-requests': '1'
}

def is_event_processed(event_title):
    """
    Check if an event has already been processed by looking for its title in the processed_events.txt file
    
    Args:
        event_title (str): The title of the event to check
        
    Returns:
        bool: True if the event has already been processed, False otherwise
    """
    processed_events_file = Path("processed_events.txt")
    
    # If the file doesn't exist, no events have been processed yet
    if not processed_events_file.exists():
        return False
    
    # Check if the event title is in the file
    with open(processed_events_file, "r", encoding="utf-8") as file:
        processed_events = file.read().splitlines()
        return event_title in processed_events

def mark_event_processed(event_title):
    """
    Mark an event as processed by adding its title to the processed_events.txt file
    
    Args:
        event_title (str): The title of the event to mark as processed
    """
    processed_events_file = Path("processed_events.txt")
    
    # Append the event title to the file
    with open(processed_events_file, "a", encoding="utf-8") as file:
        file.write(event_title + "\n")

def extract_price(soup):
    """Extract the price from the event page"""
    price_element = soup.select_one('.stage-price')
    if price_element:
        # Extract price using regex to get the numeric value
        price_text = price_element.text.strip()
        price_match = re.search(r'€\s*(\d+(?:,\d+)?)', price_text)
        if price_match:
            return price_match.group(1)
    return "Price not found"

def extract_description(soup):
    """Extract the description from the event page"""
    description_element = soup.select_one('.moretext-teaser')
    if description_element:
        # Join all paragraphs in the description
        paragraphs = description_element.find_all('p')
        if paragraphs:
            return "\n".join([p.text.strip() for p in paragraphs])
    return "Description not found"

def extract_location(soup):
    """Extract the venue and city from the event page"""
    location_info = {}
    
    # Find all event listing items
    event_items = soup.select('.event-listing-item')
    
    if event_items:
        # Take the first event item
        event_item = event_items[0]
        
        # Extract city and venue
        venue_element = event_item.select_one('.event-listing-venue')
        city_element = event_item.select_one('.event-listing-event')
        
        if city_element:
            location_info['city'] = city_element.text.strip()
        if venue_element:
            location_info['venue'] = venue_element.text.strip()
            
    return location_info if location_info else "Location not found"

def download_image(image_url, event_name):
    """
    Download an image from the provided URL and save it to a temporary folder
    
    Args:
        image_url (str): The URL of the image to download
        event_name (str): The name of the event to use in the filename
        
    Returns:
        str: The path to the saved image or None if there was an error
    """
    try:
        # Create temp_images folder if it doesn't exist
        temp_folder = Path("temp_images")
        temp_folder.mkdir(exist_ok=True)
        
        # Create a valid filename from the event name
        # Replace invalid characters and spaces with underscores
        safe_filename = "".join(c if c.isalnum() else "_" for c in event_name)
        
        # Get file extension from URL
        url_path = urllib.parse.urlparse(image_url).path
        file_ext = os.path.splitext(url_path)[1] or ".png"  # Default to .png if no extension
        
        # Create filepath
        image_path = temp_folder / f"{safe_filename}{file_ext}"
        
        print(f"Downloading image from: {image_url}")
        
        # Download the image
        img_response = requests.get(image_url, headers=headers, timeout=30)
        img_response.raise_for_status()
        
        # Save the image
        with open(image_path, 'wb') as f:
            f.write(img_response.content)
            
        print(f"Image saved to: {image_path}")
        return str(image_path)
    
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def delete_temp_image(image_path):
    """
    Delete a temporary image file after it's been uploaded
    
    Args:
        image_path (str): Path to the image file to delete
        
    Returns:
        bool: True if successfully deleted, False otherwise
    """
    if not image_path or not os.path.exists(image_path):
        return False
    
    try:
        os.remove(image_path)
        print(f"Deleted temporary image: {image_path}")
        return True
    except Exception as e:
        print(f"Error deleting temporary image {image_path}: {e}")
        return False

def random_delay(min_seconds=1, max_seconds=5):
    """
    Pause execution for a random number of seconds
    
    Args:
        min_seconds (int): Minimum delay time in seconds
        max_seconds (int): Maximum delay time in seconds
    """
    delay = random.uniform(min_seconds, max_seconds)
    print(f"Waiting for {delay:.2f} seconds...")
    time.sleep(delay)

def send_event_to_api(event_data, image_path=None, api_url='http://localhost:3000/dogodki', token=None):
    """
    Send event data to the API endpoint
    
    Args:
        event_data (dict): The event data to send
        image_path (str, optional): Path to the event image file
        api_url (str): URL of the API endpoint
        token (str, optional): Authentication token for the API
        
    Returns:
        dict: The API response or None if there was an error
    """
    try:
        print(f"Sending event data to API: {api_url}")
        
        # Prepare the headers for the API request
        api_headers = {}
        if token:
            api_headers['Authorization'] = f'Bearer {token}'
        
        # Prepare the location data (address)
        location_data = {}
        if isinstance(event_data.get('location'), dict):
            city = event_data['location'].get('city', '')
            # Extract city and postal code if it's in format "LJUBLJANA"
            postal_code = None
            city_name = city
            
            # Prepare address object
            location_data = {
                'ulica': event_data.get('venue', ''),
                'hisna_stevilka': '',  # Not available from scraped data
                'postna_stevilka': postal_code or '',
                'obcina': city_name
            }
        
        # Format date appropriately - assuming startDate is in ISO format
        event_date = event_data.get('startDate', '')
        if event_date:
            try:
                # Parse the date and format it for the API
                date_obj = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                formatted_date = date_obj.strftime("%Y-%m-%dT%H:%M:%S")
            except ValueError:
                formatted_date = event_date
        else:
            formatted_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        
        # Prepare the form data
        form_data = {
            'naslov_dogodka': event_data.get('title', ''),
            'cas': formatted_date,
            'opis': event_data.get('description', ''),
            'naslov': json.dumps(location_data),
            'tip_dogodka': event_data.get('categoryId', '1'),  # Default to 1 if not specified
            'cena': event_data.get('price', '0'),
            'je_promoviran': '0',  # Default to not promoted
            'eventim_url': event_data.get('eventim_url', '')  # Include the event URL
        }
        
        print("API request data:", form_data)
        
        # If we have an image, add it to the request
        files = None
        if image_path and os.path.exists(image_path):
            files = {
                'slika': (
                    os.path.basename(image_path),
                    open(image_path, 'rb'),
                    'image/jpeg' if image_path.lower().endswith('.jpg') or image_path.lower().endswith('.jpeg') 
                    else 'image/png'
                )
            }
            print(f"Including image file: {image_path}")
        
        # Send the request
        response = requests.post(
            api_url,
            data=form_data,
            files=files,
            headers=api_headers,
            timeout=30
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        # Close the file if it was opened
        if files:
            files['slika'][1].close()
        
        # Parse and return the response
        try:
            result = response.json()
            print(f"API Response: {result}")
            return result
        except ValueError:
            print(f"API Response (not JSON): {response.text}")
            return {'status': response.status_code, 'text': response.text}
    
    except requests.exceptions.RequestException as e:
        print(f"API request error: {e}")
        return None
    except Exception as e:
        print(f"Error sending event to API: {e}")
        return None

def extract_organizer(soup):
    """Extract the organizer name from the event page"""
    # Try to find organizer in the subscription form label
    organizer_element = soup.select_one('.evi-widget-subscription form label.evi-widget-label-email')
    if organizer_element:
        # Extract organizer using regex
        organizer_match = re.search(r'Prijavite se na e-novičke za izvajalca: (.*?)$', organizer_element.text.strip())
        if organizer_match:
            return organizer_match.group(1).strip()
    
    # Try to find in event series organizer ids from script data
    script_elements = soup.find_all('script', type='text/javascript')
    for script in script_elements:
        if script.string and "event_series_organizer_ids" in script.string:
            organizer_match = re.search(r'"event_series_organizer_ids":\[(.*?)\]', script.string)
            if organizer_match:
                organizer_id = organizer_match.group(1).strip()
                print(f"Found organizer ID: {organizer_id}")
                if organizer_id:
                    # Use the artist name as organizer if available
                    artist_name_match = re.search(r'"artist_name":"(.*?)"', script.string)
                    if artist_name_match:
                        return artist_name_match.group(1)
                    # For events with multiple artists, use the event series name
                    event_series_name_match = re.search(r'"event_series_name":"(.*?)"', script.string)
                    if event_series_name_match:
                        return event_series_name_match.group(1)

    # Try to find in meta properties
    meta_artist = soup.select_one('meta[property="og:title"]')
    if meta_artist and meta_artist.get('content'):
        return meta_artist.get('content').split(' - ')[0].strip()
    
    # Look for title in the page
    title_element = soup.select_one('.stage-headline')
    if title_element:
        title_text = title_element.text.strip()
        if ' - ' in title_text:
            return title_text.split(' - ')[0].strip()
        return title_text
    
    # If no organizer is found, use a default value
    return "Event Organizer"

def is_organizer_registered(organizer_name):
    """
    Check if an organizer has already been registered by looking for its name in the organizer_list.txt file
    
    Args:
        organizer_name (str): The name of the organizer to check
        
    Returns:
        dict: The organizer data if registered, None otherwise
    """
    organizers_file = Path("organizer_list.txt")
    
    # If the file doesn't exist, no organizers have been registered yet
    if not organizers_file.exists():
        return None
    
    # Check if the organizer is in the file
    with open(organizers_file, "r", encoding="utf-8") as file:
        for line in file:
            try:
                organizer_data = json.loads(line.strip())
                if organizer_data.get('name') == organizer_name:
                    return organizer_data
            except json.JSONDecodeError:
                continue
                
    return None

def register_organizer(organizer_name, api_url='http://localhost:3000/users/register'):
    """
    Register a new organizer via the API
    
    Args:
        organizer_name (str): The name of the organizer to register
        api_url (str): URL of the API endpoint
        
    Returns:
        dict: The API response or None if there was an error
    """
    try:
        print(f"Registering new organizer: {organizer_name}")
        
        # Generate email from name
        email = f"{organizer_name.lower().replace(' ', '')}@gmail.com"
        
        # Current date for date of birth (placeholder)
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Split the organizer name into first and last name
        name_parts = organizer_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else "Organization"
        
        # Prepare the registration data
        form_data = {
            'ime': first_name,
            'priimek': last_name,
            'email': email,
            'geslo': '123123',
            'datumRojstva': today,
            'tip_uporabnika': 'Organizator'
        }
        
        print("API register request data:", form_data)
        
        # Send the request
        response = requests.post(
            api_url,
            data=form_data,
            timeout=30
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        # Parse and return the response
        result = response.json()
        print(f"API Registration Response: {result}")
        
        # Save organizer info to file
        organizers_file = Path("organizer_list.txt")
        with open(organizers_file, "a", encoding="utf-8") as file:
            organizer_data = {
                'name': organizer_name,
                'email': email,
                'password': '123123',
                'token': result.get('token')  # Save the token too
            }
            file.write(json.dumps(organizer_data) + "\n")
        
        return result
    
    except requests.exceptions.RequestException as e:
        print(f"API registration error: {e}")
        # If error is that user already exists, we should try to log in
        if "E-pošta že obstaja" in str(e):
            print("User already exists, attempting login")
            return {'status': 'existing_user'}
        return None
    except Exception as e:
        print(f"Error registering organizer: {e}")
        return None

def login_organizer(email, password, api_url='http://localhost:3000/users/login'):
    """
    Log in an organizer via the API
    
    Args:
        email (str): The email of the organizer
        password (str): The password of the organizer
        api_url (str): URL of the API endpoint
        
    Returns:
        str: The JWT token or None if there was an error
    """
    try:
        print(f"Logging in organizer: {email}")
        
        # Prepare the login data
        form_data = {
            'email': email,
            'password': password
        }
        
        # Send the request
        response = requests.post(
            api_url,
            data=form_data,
            timeout=30
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        # Parse and return the token
        result = response.json()
        print("Login successful, got token")
        
        return result.get('token')
    
    except requests.exceptions.RequestException as e:
        print(f"API login error: {e}")
        return None
    except Exception as e:
        print(f"Error logging in organizer: {e}")
        return None

try:
    url_categories = [
        {
            "url": 'https://public-api.eventim.com/websearch/search/api/exploration/v2/productGroups?webId=web__eventim-svn&language=sl&retail_partner=SIB&categories=Glasba&categories=null&sort=Recommendation&in_stock=true',
            "category_id": "1",  # koncert
            "name": "Glasba"
        },
        {
            "url": 'https://public-api.eventim.com/websearch/search/api/exploration/v2/productGroups?webId=web__eventim-svn&language=sl&retail_partner=SIB&categories=Kultura&categories=null&sort=Recommendation&in_stock=true',
            "category_id": "2",  # kultura
            "name": "Kultura"
        },
        {
            "url": 'https://public-api.eventim.com/websearch/search/api/exploration/v2/productGroups?webId=web__eventim-svn&language=sl&retail_partner=SIB&categories=%C5%A0port&categories=null&sort=Recommendation&in_stock=true',
            "category_id": "3",  # Sport
            "name": "Sport"
        }
    ]
    
    all_product_groups = []
    
    # Process each base URL
    for url_category in url_categories:
        base_url = url_category["url"]
        category_id = url_category["category_id"]
        category_name = url_category["name"]
        
        print(f"\n===== Processing category: {category_name} (ID: {category_id}) =====")
        
        # Start with page 1
        current_page = 1
        total_pages = 1  # Default to 1, will be updated after first request
        
        # Process all available pages for this category
        while current_page <= total_pages:
            print(f"\nFetching page {current_page} of {total_pages} for category {category_name}...")
            
            # Build URL with current page number
            page_url = f"{base_url}&page={current_page}"
            
            # Make the request
            groups_response = requests.get(
                page_url,
                headers=headers,
                timeout=30
            )
            
            # Check if the request was successful
            groups_response.raise_for_status()
            
            # Parse JSON response
            groups = json.loads(groups_response.text)
            
            # Update total pages if this is the first request
            if current_page == 1 and "totalPages" in groups:
                total_pages = groups["totalPages"]
                print(f"Found {total_pages} total pages of events for category {category_name}")
            
            # Add product groups from this page to our collection
            # Store the category ID with each product for later use
            if "productGroups" in groups and len(groups["productGroups"]) > 0:
                # Add category ID to each product
                for product in groups["productGroups"]:
                    product["api_category_id"] = category_id
                
                all_product_groups.extend(groups["productGroups"])
                print(f"Found {len(groups['productGroups'])} events on page {current_page} for category {category_name}")
            
            # Move to next page
            current_page += 1
    
    # Process all collected product groups
    if all_product_groups:
        print(f"\nProcessing {len(all_product_groups)} total events across all categories")
        
        # Process each product group
        for product_index, product in enumerate(all_product_groups):
            try:
                # Extract basic event info
                naslov_dogodka = product["name"]
                print(f"\nProcessing event {product_index + 1}/{len(all_product_groups)}: {naslov_dogodka}")
                
                # Check if this event has already been processed
                if is_event_processed(naslov_dogodka):
                    print(f"Event '{naslov_dogodka}' has already been processed, skipping...")
                    continue
                
                # Continue with event processing
                startDate = product["startDate"]
                imageUrl = product["imageUrl"]
                kategorija = product["categories"][0]["name"] if product["categories"] else "Unknown"
                link = product["link"]
                # Get the API category ID we added earlier
                category_id = product.get("api_category_id", "1")  # Default to 1 if not found
                
                print(f"Following link: {link}")
                print(f"Using category ID: {category_id}")
                
                # Download event image
                image_path = download_image(imageUrl, naslov_dogodka)
                
                # Second request with headers
                html_response = requests.get(
                    link,
                    headers=headers,
                    timeout=30
                )
                
                # Check if the request was successful
                html_response.raise_for_status()
                
                # Parse HTML with BeautifulSoup
                soup = BeautifulSoup(html_response.text, 'html.parser')
                
                # Extract event details
                price = extract_price(soup)
                description = extract_description(soup)
                location = extract_location(soup)
                
                # Extract organizer information
                organizer_name = extract_organizer(soup)
                print(f"Event organizer: {organizer_name}")
                
                # Check if organizer is already registered
                organizer_data = is_organizer_registered(organizer_name)
                organizer_token = None
                
                if organizer_data:
                    print(f"Organizer '{organizer_name}' is already registered")
                    # Get saved token if available, otherwise log in to get a new one
                    if organizer_data.get('token'):
                        organizer_token = organizer_data.get('token')
                        print(f"Using saved token for organizer '{organizer_name}'")
                    else:
                        print(f"No saved token found, logging in...")
                        organizer_token = login_organizer(
                            organizer_data.get('email'),
                            organizer_data.get('password')
                        )
                else:
                    print(f"Registering new organizer: {organizer_name}")
                    # Register organizer
                    register_result = register_organizer(organizer_name)
                    
                    if register_result and register_result.get('token'):
                        organizer_token = register_result.get('token')
                        print(f"Got token directly from registration")
                
                if not organizer_token:
                    print("Failed to get organizer token, using default token")
                    # Use default token if we couldn't get one for the organizer
                    organizer_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVwb3JhYm5payI6MiwidGlwX3Vwb3JhYm5pa2EiOiJBZG1pbmlzdHJhdG9yIiwiaWF0IjoxNzQ4MzQ0OTI4fQ.zSgVVwBLVjeLS5JjPyeak8hr0ORHM1dMxvpAhiW259I"
                
                # Print extracted information
                print("\n--- EVENT DETAILS ---")
                print(f"Event: {naslov_dogodka}")
                print(f"Category: {kategorija}")
                print(f"Date: {startDate}")
                print(f"Price: {price}€")
                print(f"Organizer: {organizer_name}")
                if isinstance(location, dict):
                    print(f"Location: {location.get('venue', 'N/A')} in {location.get('city', 'N/A')}")
                else:
                    print(f"Location: {location}")
                if image_path:
                    print(f"Image saved at: {image_path}")
                print("\nDescription:")
                print(description[:500] + "..." if len(description) > 500 else description)
                print("\n--- END OF DETAILS ---")
                
                # Prepare data for API
                event_data = {
                    'title': naslov_dogodka,
                    'description': description,
                    'startDate': startDate,
                    'price': price.replace(',', '.') if isinstance(price, str) else price,  # Convert comma to dot for decimal
                    'location': location,
                    'venue': location.get('venue', '') if isinstance(location, dict) else '',
                    'categoryId': category_id,  # Use the category ID from the URL definition
                    'eventim_url': link # Include the event URL
                }
                
                # Add a random delay before making API request (appear less bot-like)
                #random_delay(2, 7)
                
                # Use the organizer's token to create the event
                api_response = send_event_to_api(event_data, image_path, token=organizer_token)
                
                if api_response:
                    print("Event created/updated in database:", api_response)
                    # Mark this event as processed after successful API submission
                    mark_event_processed(naslov_dogodka)
                    # Delete temp image after successful upload
                    if image_path:
                        delete_temp_image(image_path)
                else:
                    print("Failed to create/update event in database")
                
                # Add a random delay between processing events
                #if product_index < len(all_product_groups) - 1:
                #    random_delay(3, 10)
                    
            except Exception as e:
                print(f"Error processing event {naslov_dogodka}: {e}")
                # Clean up image even if processing failed
                if 'image_path' in locals() and image_path:
                    delete_temp_image(image_path)
                # Continue with next event instead of stopping the whole script
                continue
    else:
        print("No product groups found in the response")
        
except requests.exceptions.RequestException as e:
    print(f"Request error: {e}")
except json.JSONDecodeError as e:
    print(f"JSON parsing error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
import requests
import json
from bs4 import BeautifulSoup
import re
import os
import urllib.parse
from pathlib import Path
from datetime import datetime
import time
import random

# User agent is one of the most important headers
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-GB,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua': '"Chromium";v="136", "Brave";v="136", "Not.A/Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-gpc': '1',
    'upgrade-insecure-requests': '1'
}

def is_event_processed(event_title):
    """
    Check if an event has already been processed by looking for its title in the processed_events.txt file
    
    Args:
        event_title (str): The title of the event to check
        
    Returns:
        bool: True if the event has already been processed, False otherwise
    """
    processed_events_file = Path("processed_events.txt")
    
    # If the file doesn't exist, no events have been processed yet
    if not processed_events_file.exists():
        return False
    
    # Check if the event title is in the file
    with open(processed_events_file, "r", encoding="utf-8") as file:
        processed_events = file.read().splitlines()
        return event_title in processed_events

def mark_event_processed(event_title):
    """
    Mark an event as processed by adding its title to the processed_events.txt file
    
    Args:
        event_title (str): The title of the event to mark as processed
    """
    processed_events_file = Path("processed_events.txt")
    
    # Append the event title to the file
    with open(processed_events_file, "a", encoding="utf-8") as file:
        file.write(event_title + "\n")

def extract_price(soup):
    """Extract the price from the event page"""
    price_element = soup.select_one('.stage-price')
    if price_element:
        # Extract price using regex to get the numeric value
        price_text = price_element.text.strip()
        price_match = re.search(r'€\s*(\d+(?:,\d+)?)', price_text)
        if price_match:
            return price_match.group(1)
    return "Price not found"

def extract_description(soup):
    """Extract the description from the event page"""
    description_element = soup.select_one('.moretext-teaser')
    if description_element:
        # Join all paragraphs in the description
        paragraphs = description_element.find_all('p')
        if paragraphs:
            return "\n".join([p.text.strip() for p in paragraphs])
    return "Description not found"

def extract_location(soup):
    """Extract the venue and city from the event page"""
    location_info = {}
    
    # Find all event listing items
    event_items = soup.select('.event-listing-item')
    
    if event_items:
        # Take the first event item
        event_item = event_items[0]
        
        # Extract city and venue
        venue_element = event_item.select_one('.event-listing-venue')
        city_element = event_item.select_one('.event-listing-event')
        
        if city_element:
            location_info['city'] = city_element.text.strip()
        if venue_element:
            location_info['venue'] = venue_element.text.strip()
            
    return location_info if location_info else "Location not found"

def download_image(image_url, event_name):
    """
    Download an image from the provided URL and save it to a temporary folder
    
    Args:
        image_url (str): The URL of the image to download
        event_name (str): The name of the event to use in the filename
        
    Returns:
        str: The path to the saved image or None if there was an error
    """
    try:
        # Create temp_images folder if it doesn't exist
        temp_folder = Path("temp_images")
        temp_folder.mkdir(exist_ok=True)
        
        # Create a valid filename from the event name
        # Replace invalid characters and spaces with underscores
        safe_filename = "".join(c if c.isalnum() else "_" for c in event_name)
        
        # Get file extension from URL
        url_path = urllib.parse.urlparse(image_url).path
        file_ext = os.path.splitext(url_path)[1] or ".png"  # Default to .png if no extension
        
        # Create filepath
        image_path = temp_folder / f"{safe_filename}{file_ext}"
        
        print(f"Downloading image from: {image_url}")
        
        # Download the image
        img_response = requests.get(image_url, headers=headers, timeout=30)
        img_response.raise_for_status()
        
        # Save the image
        with open(image_path, 'wb') as f:
            f.write(img_response.content)
            
        print(f"Image saved to: {image_path}")
        return str(image_path)
    
    except Exception as e:
        print(f"Error downloading image: {e}")
        return None

def delete_temp_image(image_path):
    """
    Delete a temporary image file after it's been uploaded
    
    Args:
        image_path (str): Path to the image file to delete
        
    Returns:
        bool: True if successfully deleted, False otherwise
    """
    if not image_path or not os.path.exists(image_path):
        return False
    
    try:
        os.remove(image_path)
        print(f"Deleted temporary image: {image_path}")
        return True
    except Exception as e:
        print(f"Error deleting temporary image {image_path}: {e}")
        return False

def random_delay(min_seconds=1, max_seconds=5):
    """
    Pause execution for a random number of seconds
    
    Args:
        min_seconds (int): Minimum delay time in seconds
        max_seconds (int): Maximum delay time in seconds
    """
    delay = random.uniform(min_seconds, max_seconds)
    print(f"Waiting for {delay:.2f} seconds...")
    time.sleep(delay)

def send_event_to_api(event_data, image_path=None, api_url='http://localhost:3000/dogodki', token=None):
    """
    Send event data to the API endpoint
    
    Args:
        event_data (dict): The event data to send
        image_path (str, optional): Path to the event image file
        api_url (str): URL of the API endpoint
        token (str, optional): Authentication token for the API
        
    Returns:
        dict: The API response or None if there was an error
    """
    try:
        print(f"Sending event data to API: {api_url}")
        
        # Prepare the headers for the API request
        api_headers = {}
        if token:
            api_headers['Authorization'] = f'Bearer {token}'
        
        # Prepare the location data (address)
        location_data = {}
        if isinstance(event_data.get('location'), dict):
            city = event_data['location'].get('city', '')
            # Extract city and postal code if it's in format "LJUBLJANA"
            postal_code = None
            city_name = city
            
            # Prepare address object
            location_data = {
                'ulica': event_data.get('venue', ''),
                'hisna_stevilka': '',  # Not available from scraped data
                'postna_stevilka': postal_code or '',
                'obcina': city_name
            }
        
        # Format date appropriately - assuming startDate is in ISO format
        event_date = event_data.get('startDate', '')
        if event_date:
            try:
                # Parse the date and format it for the API
                date_obj = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                formatted_date = date_obj.strftime("%Y-%m-%dT%H:%M:%S")
            except ValueError:
                formatted_date = event_date
        else:
            formatted_date = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        
        # Prepare the form data
        form_data = {
            'naslov_dogodka': event_data.get('title', ''),
            'cas': formatted_date,
            'opis': event_data.get('description', ''),
            'naslov': json.dumps(location_data),
            'tip_dogodka': event_data.get('categoryId', '1'),  # Default to 1 if not specified
            'cena': event_data.get('price', '0'),
            'je_promoviran': '0',  # Default to not promoted
            'eventim_url': event_data.get('eventim_url', '')  # Include the event URL
        }
        
        print("API request data:", form_data)
        
        # If we have an image, add it to the request
        files = None
        if image_path and os.path.exists(image_path):
            files = {
                'slika': (
                    os.path.basename(image_path),
                    open(image_path, 'rb'),
                    'image/jpeg' if image_path.lower().endswith('.jpg') or image_path.lower().endswith('.jpeg') 
                    else 'image/png'
                )
            }
            print(f"Including image file: {image_path}")
        
        # Send the request
        response = requests.post(
            api_url,
            data=form_data,
            files=files,
            headers=api_headers,
            timeout=30
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        # Close the file if it was opened
        if files:
            files['slika'][1].close()
        
        # Parse and return the response
        try:
            result = response.json()
            print(f"API Response: {result}")
            return result
        except ValueError:
            print(f"API Response (not JSON): {response.text}")
            return {'status': response.status_code, 'text': response.text}
    
    except requests.exceptions.RequestException as e:
        print(f"API request error: {e}")
        return None
    except Exception as e:
        print(f"Error sending event to API: {e}")
        return None

def extract_organizer(soup):
    """Extract the organizer name from the event page"""
    # Try to find organizer in the subscription form label
    organizer_element = soup.select_one('.evi-widget-subscription form label.evi-widget-label-email')
    if organizer_element:
        # Extract organizer using regex
        organizer_match = re.search(r'Prijavite se na e-novičke za izvajalca: (.*?)$', organizer_element.text.strip())
        if organizer_match:
            return organizer_match.group(1).strip()
    
    # Try to find in event series organizer ids from script data
    script_elements = soup.find_all('script', type='text/javascript')
    for script in script_elements:
        if script.string and "event_series_organizer_ids" in script.string:
            organizer_match = re.search(r'"event_series_organizer_ids":\[(.*?)\]', script.string)
            if organizer_match:
                organizer_id = organizer_match.group(1).strip()
                print(f"Found organizer ID: {organizer_id}")
                if organizer_id:
                    # Use the artist name as organizer if available
                    artist_name_match = re.search(r'"artist_name":"(.*?)"', script.string)
                    if artist_name_match:
                        return artist_name_match.group(1)
                    # For events with multiple artists, use the event series name
                    event_series_name_match = re.search(r'"event_series_name":"(.*?)"', script.string)
                    if event_series_name_match:
                        return event_series_name_match.group(1)

    # Try to find in meta properties
    meta_artist = soup.select_one('meta[property="og:title"]')
    if meta_artist and meta_artist.get('content'):
        return meta_artist.get('content').split(' - ')[0].strip()
    
    # Look for title in the page
    title_element = soup.select_one('.stage-headline')
    if title_element:
        title_text = title_element.text.strip()
        if ' - ' in title_text:
            return title_text.split(' - ')[0].strip()
        return title_text
    
    # If no organizer is found, use a default value
    return "Unknown organizer"

def is_organizer_registered(organizer_name):
    """
    Check if an organizer has already been registered by looking for its name in the organizer_list.txt file
    
    Args:
        organizer_name (str): The name of the organizer to check
        
    Returns:
        dict: The organizer data if registered, None otherwise
    """
    organizers_file = Path("organizer_list.txt")
    
    # If the file doesn't exist, no organizers have been registered yet
    if not organizers_file.exists():
        return None
    
    # Check if the organizer is in the file
    with open(organizers_file, "r", encoding="utf-8") as file:
        for line in file:
            try:
                organizer_data = json.loads(line.strip())
                if organizer_data.get('name') == organizer_name:
                    return organizer_data
            except json.JSONDecodeError:
                continue
                
    return None

def register_organizer(organizer_name, api_url='http://localhost:3000/users/register'):
    """
    Register a new organizer via the API
    
    Args:
        organizer_name (str): The name of the organizer to register
        api_url (str): URL of the API endpoint
        
    Returns:
        dict: The API response or None if there was an error
    """
    try:
        print(f"Registering new organizer: {organizer_name}")
        
        # Generate email from name
        email = f"{organizer_name.lower().replace(' ', '')}@gmail.com"
        
        # Current date for date of birth (placeholder)
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Split the organizer name into first and last name
        name_parts = organizer_name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else "Organization"
        
        # Prepare the registration data
        form_data = {
            'ime': first_name,
            'priimek': last_name,
            'email': email,
            'geslo': '123123',
            'datumRojstva': today,
            'tip_uporabnika': 'Organizator'
        }
        
        print("API register request data:", form_data)
        
        # Send the request
        response = requests.post(
            api_url,
            data=form_data,
            timeout=30
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        # Parse and return the response
        result = response.json()
        print(f"API Registration Response: {result}")
        
        # Save organizer info to file
        organizers_file = Path("organizer_list.txt")
        with open(organizers_file, "a", encoding="utf-8") as file:
            organizer_data = {
                'name': organizer_name,
                'email': email,
                'password': '123123',
                'token': result.get('token')  # Save the token too
            }
            file.write(json.dumps(organizer_data) + "\n")
        
        return result
    
    except requests.exceptions.RequestException as e:
        print(f"API registration error: {e}")
        # If error is that user already exists, we should try to log in
        if "E-pošta že obstaja" in str(e):
            print("User already exists, attempting login")
            return {'status': 'existing_user'}
        return None
    except Exception as e:
        print(f"Error registering organizer: {e}")
        return None

def login_organizer(email, password, api_url='http://localhost:3000/users/login'):
    """
    Log in an organizer via the API
    
    Args:
        email (str): The email of the organizer
        password (str): The password of the organizer
        api_url (str): URL of the API endpoint
        
    Returns:
        str: The JWT token or None if there was an error
    """
    try:
        print(f"Logging in organizer: {email}")
        
        # Prepare the login data
        form_data = {
            'email': email,
            'password': password
        }
        
        # Send the request
        response = requests.post(
            api_url,
            data=form_data,
            timeout=30
        )
        
        # Check if request was successful
        response.raise_for_status()
        
        # Parse and return the token
        result = response.json()
        print("Login successful, got token")
        
        return result.get('token')
    
    except requests.exceptions.RequestException as e:
        print(f"API login error: {e}")
        return None
    except Exception as e:
        print(f"Error logging in organizer: {e}")
        return None

try:
    url_categories = [
        {
            "url": 'https://public-api.eventim.com/websearch/search/api/exploration/v2/productGroups?webId=web__eventim-svn&language=sl&retail_partner=SIB&categories=Glasba&categories=null&sort=Recommendation&in_stock=true',
            "category_id": "1",  # koncert
            "name": "Glasba"
        },
        {
            "url": 'https://public-api.eventim.com/websearch/search/api/exploration/v2/productGroups?webId=web__eventim-svn&language=sl&retail_partner=SIB&categories=Kultura&categories=null&sort=Recommendation&in_stock=true',
            "category_id": "2",  # kultura
            "name": "Kultura"
        },
        {
            "url": 'https://public-api.eventim.com/websearch/search/api/exploration/v2/productGroups?webId=web__eventim-svn&language=sl&retail_partner=SIB&categories=%C5%A0port&categories=null&sort=Recommendation&in_stock=true',
            "category_id": "3",  # Sport
            "name": "Sport"
        }
    ]
    
    all_product_groups = []
    
    # Process each base URL
    for url_category in url_categories:
        base_url = url_category["url"]
        category_id = url_category["category_id"]
        category_name = url_category["name"]
        
        print(f"\n===== Processing category: {category_name} (ID: {category_id}) =====")
        
        # Start with page 1
        current_page = 1
        total_pages = 1  # Default to 1, will be updated after first request
        
        # Process all available pages for this category
        while current_page <= total_pages:
            print(f"\nFetching page {current_page} of {total_pages} for category {category_name}...")
            
            # Build URL with current page number
            page_url = f"{base_url}&page={current_page}"
            
            # Make the request
            groups_response = requests.get(
                page_url,
                headers=headers,
                timeout=30
            )
            
            # Check if the request was successful
            groups_response.raise_for_status()
            
            # Parse JSON response
            groups = json.loads(groups_response.text)
            
            # Update total pages if this is the first request
            if current_page == 1 and "totalPages" in groups:
                total_pages = groups["totalPages"]
                print(f"Found {total_pages} total pages of events for category {category_name}")
            
            # Add product groups from this page to our collection
            # Store the category ID with each product for later use
            if "productGroups" in groups and len(groups["productGroups"]) > 0:
                # Add category ID to each product
                for product in groups["productGroups"]:
                    product["api_category_id"] = category_id
                
                all_product_groups.extend(groups["productGroups"])
                print(f"Found {len(groups['productGroups'])} events on page {current_page} for category {category_name}")
            
            # Move to next page
            current_page += 1
    
    # Process all collected product groups
    if all_product_groups:
        print(f"\nProcessing {len(all_product_groups)} total events across all categories")
        
        # Process each product group
        for product_index, product in enumerate(all_product_groups):
            try:
                # Extract basic event info
                naslov_dogodka = product["name"]
                print(f"\nProcessing event {product_index + 1}/{len(all_product_groups)}: {naslov_dogodka}")
                
                # Check if this event has already been processed
                if is_event_processed(naslov_dogodka):
                    print(f"Event '{naslov_dogodka}' has already been processed, skipping...")
                    continue
                
                # Continue with event processing
                startDate = product["startDate"]
                imageUrl = product["imageUrl"]
                kategorija = product["categories"][0]["name"] if product["categories"] else "Unknown"
                link = product["link"]
                # Get the API category ID we added earlier
                category_id = product.get("api_category_id", "1")  # Default to 1 if not found
                
                print(f"Following link: {link}")
                print(f"Using category ID: {category_id}")
                
                # Download event image
                image_path = download_image(imageUrl, naslov_dogodka)
                
                # Second request with headers
                html_response = requests.get(
                    link,
                    headers=headers,
                    timeout=30
                )
                
                # Check if the request was successful
                html_response.raise_for_status()
                
                # Parse HTML with BeautifulSoup
                soup = BeautifulSoup(html_response.text, 'html.parser')
                
                # Extract event details
                price = extract_price(soup)
                description = extract_description(soup)
                location = extract_location(soup)
                
                # Extract organizer information
                organizer_name = extract_organizer(soup)
                print(f"Event organizer: {organizer_name}")
                
                # Check if organizer is already registered
                organizer_data = is_organizer_registered(organizer_name)
                organizer_token = None
                
                if organizer_data:
                    print(f"Organizer '{organizer_name}' is already registered")
                    # Get saved token if available, otherwise log in to get a new one
                    if organizer_data.get('token'):
                        organizer_token = organizer_data.get('token')
                        print(f"Using saved token for organizer '{organizer_name}'")
                    else:
                        print(f"No saved token found, logging in...")
                        organizer_token = login_organizer(
                            organizer_data.get('email'),
                            organizer_data.get('password')
                        )
                else:
                    print(f"Registering new organizer: {organizer_name}")
                    # Register organizer
                    register_result = register_organizer(organizer_name)
                    
                    if register_result and register_result.get('token'):
                        organizer_token = register_result.get('token')
                        print(f"Got token directly from registration")
                
                if not organizer_token:
                    print("Failed to get organizer token, using default token")
                    # Use default token if we couldn't get one for the organizer
                    organizer_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZFVwb3JhYm5payI6MiwidGlwX3Vwb3JhYm5pa2EiOiJBZG1pbmlzdHJhdG9yIiwiaWF0IjoxNzQ4MzQ0OTI4fQ.zSgVVwBLVjeLS5JjPyeak8hr0ORHM1dMxvpAhiW259I"
                
                # Print extracted information
                print("\n--- EVENT DETAILS ---")
                print(f"Event: {naslov_dogodka}")
                print(f"Category: {kategorija}")
                print(f"Date: {startDate}")
                print(f"Price: {price}€")
                print(f"Organizer: {organizer_name}")
                if isinstance(location, dict):
                    print(f"Location: {location.get('venue', 'N/A')} in {location.get('city', 'N/A')}")
                else:
                    print(f"Location: {location}")
                if image_path:
                    print(f"Image saved at: {image_path}")
                print("\nDescription:")
                print(description[:500] + "..." if len(description) > 500 else description)
                print("\n--- END OF DETAILS ---")
                
                # Prepare data for API
                event_data = {
                    'title': naslov_dogodka,
                    'description': description,
                    'startDate': startDate,
                    'price': price.replace(',', '.') if isinstance(price, str) else price,  # Convert comma to dot for decimal
                    'location': location,
                    'venue': location.get('venue', '') if isinstance(location, dict) else '',
                    'categoryId': category_id,  # Use the category ID from the URL definition
                    'eventim_url': link # Include the event URL
                }
                
                # Add a random delay before making API request (appear less bot-like)
                #random_delay(2, 7)
                
                # Use the organizer's token to create the event
                api_response = send_event_to_api(event_data, image_path, token=organizer_token)
                
                if api_response:
                    print("Event created/updated in database:", api_response)
                    # Mark this event as processed after successful API submission
                    mark_event_processed(naslov_dogodka)
                    # Delete temp image after successful upload
                    if image_path:
                        delete_temp_image(image_path)
                else:
                    print("Failed to create/update event in database")
                
                # Add a random delay between processing events
                #if product_index < len(all_product_groups) - 1:
                #    random_delay(3, 10)
                    
            except Exception as e:
                print(f"Error processing event {naslov_dogodka}: {e}")
                # Clean up image even if processing failed
                if 'image_path' in locals() and image_path:
                    delete_temp_image(image_path)
                # Continue with next event instead of stopping the whole script
                continue
    else:
        print("No product groups found in the response")
        
except requests.exceptions.RequestException as e:
    print(f"Request error: {e}")
except json.JSONDecodeError as e:
    print(f"JSON parsing error: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
