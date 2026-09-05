import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Bayanko Uptime',description:'Private monitoring for your websites and services.',robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>;
}
