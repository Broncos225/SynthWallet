
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { siteConfig } from "@/config/site"; // Import siteConfig

export default function SettingsPage() {
  return (
    <div className="space-y-6">
       <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
         {siteConfig.settingsNavItems.map((item) => (
            <Card key={item.href} className="shadow-sm">
              <CardHeader>
                  <CardTitle className="flex items-center">
                    <item.icon className="mr-2 h-5 w-5 text-primary"/>
                    {item.title}
                  </CardTitle>
                  {item.description && <CardDescription>{item.description}</CardDescription>}
              </CardHeader>
              <CardContent>
                  <Button asChild className="w-full sm:w-auto">
                      <Link href={item.href}>Gestionar {item.title}</Link>
                  </Button>
              </CardContent>
            </Card>
         ))}
       </div>
    </div>
  );
}

    