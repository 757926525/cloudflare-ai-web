"use client";

import { Box, ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { getStoredCustomApis } from "@/components/admin-settings-dialog";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Model } from "@/lib/models";
import { getStoredModelId, type StoredModelKey } from "@/lib/utils";

const getGroupedModels = (models: Model[]) => {
  const groupedModels: {
    type: Model["type"];
    models: Model[];
  }[] = [];

  for (const model of models) {
    let group = groupedModels.find((g) => g.type === model.type);
    if (!group) {
      group = { type: model.type, models: [] as Model[] };
      groupedModels.push(group);
    }
    group.models.push(model);
  }

  return groupedModels;
};

const ModelList = ({
  models,
  setOpen,
  setSelectedModel,
}: {
  models: Model[];
  setOpen: (open: boolean) => void;
  setSelectedModel: (models: Model) => void;
}) => {
  const groupedModels = getGroupedModels(models);

  return (
    <Command>
      <CommandInput placeholder="Filter models..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groupedModels.map(({ type, models }) => (
          <CommandGroup key={type} heading={type}>
            {models.map((model) => (
              <CommandItem
                key={model.id}
                value={model.id}
                onSelect={(value) => {
                  setSelectedModel(
                    models.find((m) => m.id === value) ?? models[0],
                  );
                  setOpen(false);
                }}
              >
                <span className="size-4 flex items-center justify-center">
                  {model.logo}
                </span>
                {model.name}
                {model.tag?.map((item) => (
                  <Badge key={item} variant="outline" className="ml-auto">
                    {item}
                  </Badge>
                ))}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
};

function ComboBoxResponsive({
  models,
  modalKey,
  selectedModel,
  setSelectedModel,
}: {
  models: Model[];
  modalKey: StoredModelKey;
  selectedModel?: Model;
  setSelectedModel: (model: Model) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const [allModels, setAllModels] = useState<Model[]>(models);

  useEffect(() => {
    const updateModels = () => {
      const customApis = getStoredCustomApis();
      const customModelList: Model[] = customApis.map((api) => ({
        id: api.id,
        name: api.name,
        logo: <Box className="size-4" />,
        type: api.type,
        provider: "custom" as const,
        tag: ["custom"],
        baseUrl: api.baseUrl,
        apiKey: api.apiKey,
      }));

      // Filter based on whether current selection context is Image or Chat
      const isImageContext = modalKey === "CF_AI_MODEL_IMAGE";
      const filteredCustom = customModelList.filter((m) =>
        isImageContext ? m.type === "Text to Image" : m.type === "Text Generation",
      );

      setAllModels([...models, ...filteredCustom]);
    };

    updateModels();
    window.addEventListener("custom-apis-updated", updateModels);
    return () => window.removeEventListener("custom-apis-updated", updateModels);
  }, [models, modalKey]);

  useEffect(() => {
    const storedId = getStoredModelId(modalKey);
    const found = allModels.find((item) => item.id === storedId);
    setSelectedModel(found ?? allModels[0] ?? models[0]);
  }, [allModels, modalKey, setSelectedModel, models]);

  useEffect(() => {
    if (selectedModel) {
      localStorage.setItem(modalKey, selectedModel.id);
    }
  }, [selectedModel, modalKey]);

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {selectedModel && (
            <Button variant="ghost">
              <span className="size-4 flex items-center justify-center">
                {selectedModel.logo}
              </span>
              {selectedModel.name}
              <ChevronDown />
            </Button>
          )}
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <ModelList
            setOpen={setOpen}
            setSelectedModel={setSelectedModel}
            models={allModels}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        {selectedModel && (
          <Button variant="ghost">
            <span className="size-4 flex items-center justify-center">
              {selectedModel.logo}
            </span>
            {selectedModel.name}
            <ChevronDown />
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerTitle></DrawerTitle>
        <div className="mt-4 border-t">
          <ModelList
            setOpen={setOpen}
            setSelectedModel={setSelectedModel}
            models={allModels}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}

const ModelSelect = ({
  models,
  modalKey,
  selectedModel,
  setSelectedModel,
}: {
  models: Model[];
  modalKey: StoredModelKey;
  selectedModel?: Model;
  setSelectedModel: (model: Model) => void;
}) => {
  return (
    <ComboBoxResponsive
      models={models}
      modalKey={modalKey}
      selectedModel={selectedModel}
      setSelectedModel={setSelectedModel}
    ></ComboBoxResponsive>
  );
};

export default ModelSelect;
