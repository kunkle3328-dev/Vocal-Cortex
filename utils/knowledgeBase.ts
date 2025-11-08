// Define the schema for a product in our knowledge base
export interface Product {
  id: string;
  name: string;
  category: 'Laptop' | 'Phone' | 'Accessory';
  description: string;
  price: number;
  features: string[];
  in_stock: boolean;
}

// Our knowledge base data, acting as a local database
const knowledgeBase: Product[] = [
  {
    id: 'nb-pro-01',
    name: 'NovaBook Pro',
    category: 'Laptop',
    description: 'A powerful and sleek laptop for professionals. Features the latest M-series chip for unparalleled performance.',
    price: 1999.99,
    features: ['14-inch Liquid Retina XDR display', 'M4 Pro Chip', '18-hour battery life', '1080p FaceTime HD camera'],
    in_stock: true,
  },
  {
    id: 'sp-zen-01',
    name: 'StellarPhone Zen',
    category: 'Phone',
    description: 'The smartphone that redefines photography with its advanced AI-powered camera system.',
    price: 999.00,
    features: ['6.7-inch OLED display', 'A18 Bionic Chip', 'Triple-camera system', '5G connectivity'],
    in_stock: true,
  },
  {
    id: 'qw-buds-01',
    name: 'QuietWave Buds',
    category: 'Accessory',
    description: 'Immersive sound with industry-leading noise cancellation.',
    price: 249.00,
    features: ['Active Noise Cancellation', 'Transparency Mode', 'Up to 30 hours of listening time', 'Sweat and water resistant'],
    in_stock: false,
  },
];

/**
 * Retrieval mechanism to find a product by its name (case-insensitive).
 * This function simulates querying a database.
 * @param productName The name of the product to search for.
 * @returns The product object if found, otherwise an error object.
 */
export function findProduct(productName: string): Product | { error: string } {
  console.log(`Knowledge Base Query: Searching for product "${productName}"`);
  const product = knowledgeBase.find(p => p.name.toLowerCase() === productName.toLowerCase());
  if (product) {
    return product;
  }
  return { error: `Product '${productName}' not found in the knowledge base.` };
}
