// FileActionsMenu.jsx
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function FileActionsMenu({ item, onAction }) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="opacity-0 group-hover:opacity-100">
                    <MoreVertical size={16} />
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAction("preview", item)}>
                    Preview
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onAction("download", item)}>
                    Descargar
                </DropdownMenuItem>

                <DropdownMenuItem onClick={() => onAction("delete", item)}>
                    Eliminar
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}