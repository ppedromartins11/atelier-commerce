import { NextResponse } from 'next/server';
export async function GET() {
  return NextResponse.json({service:'atelier-commerce-platform',status:process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?'configured':'setup_required',version:'0.1.0'});
}
