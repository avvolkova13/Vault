import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { catalogProducts } from "@/data/products";
import { ProductDetailScreen } from "@/features/product/ProductDetailScreen";
import { sanitizeCatalogReturnPath } from "@/lib/catalog";
import { getProductBySlug, getRelatedProducts } from "@/lib/products";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return catalogProducts.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(catalogProducts, slug);

  if (!product) {
    return { title: "Товар не найден — Vault" };
  }

  return {
    title: `${product.title} — Vault`,
    description: `${product.description} Стоимость: ${product.priceCoins.toLocaleString("ru-RU")} Coins.`,
  };
}

export default async function ProductPage({ params, searchParams }: ProductPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const product = getProductBySlug(catalogProducts, slug);

  if (!product) notFound();

  return (
    <ProductDetailScreen
      product={product}
      relatedProducts={getRelatedProducts(catalogProducts, product, 4)}
      catalogReturnHref={sanitizeCatalogReturnPath(Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo)}
    />
  );
}
