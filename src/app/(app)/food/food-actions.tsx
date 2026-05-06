"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddFoodDialog } from "./add-food-dialog";
import type { Meal } from "@/types/database";

export function FoodActions({
  defaultDate,
  defaultMeal,
  compact,
}: {
  defaultDate: string;
  defaultMeal?: Meal;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        size={compact ? "sm" : "md"}
        variant={compact ? "secondary" : "primary"}
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" /> {compact ? "Add" : "Log food"}
      </Button>
      <AddFoodDialog
        open={open}
        onClose={() => setOpen(false)}
        defaultDate={defaultDate}
        defaultMeal={defaultMeal}
      />
    </>
  );
}
