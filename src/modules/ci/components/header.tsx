import { Header } from "@/components/header"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { useLocation } from "react-router-dom"

export function CIHeader() {

  const { pathname } = useLocation()

  return (
    <Header>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/ci">Core Identity</BreadcrumbLink>
          </BreadcrumbItem>
          {
            pathname === '/ci/operator' && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Operadores</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )
          }
          {
            pathname === '/ci/operator/create' && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/ci/operator">Operadores</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Novo</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )
          }
          {
            pathname.startsWith('/ci/operator/edit') && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink href="/ci/operator">Operadores</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>Editar</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )
          }
        </BreadcrumbList>
      </Breadcrumb>
    </Header>
  )
}
