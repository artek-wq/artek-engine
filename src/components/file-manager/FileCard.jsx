import { File, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import FileActionsMenu from "./FileActionsMenu";

export default function FileCard({
    item,
    onOpen,
    onSelect,
    selected,
}) {
    const isFolder = item.type === "folder";

    return (
        <div
            onClick={() => onSelect(item)}
            onDoubleClick={() => isFolder && onOpen(item)}
            className={cn(
                "group relative p-4 rounded-xl border bg-white transition-all cursor-pointer",
                "hover:shadow-md hover:border-gray-300",
                selected && "border-blue-500 shadow-sm bg-blue-50"
            )}
        >
            {/* ICONO */}
            <div className="flex justify-between items-start">
                <div>
                    {isFolder ? (
                        <Folder className="w-10 h-10 text-blue-500" />
                    ) : (
                        <File className="w-10 h-10 text-gray-400" />
                    )}
                </div>

                {/* MENÚ */}
                <div className="opacity-0 group-hover:opacity-100 transition">
                    <FileActionsMenu item={item} />
                </div>
            </div>

            {/* NOMBRE */}
            <p className="mt-3 text-sm font-medium truncate">
                {item.name}
            </p>

            {/* META (opcional como en tu UI) */}
            {!isFolder && (
                <p className="text-xs text-gray-400 mt-1">
                    {item.size || "0 KB"}
                </p>
            )}
        </div>
    );
}